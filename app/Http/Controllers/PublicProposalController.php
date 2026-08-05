<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Api\ApiResponse;
use App\Models\AppSetting;
use App\Models\Client;
use App\Models\Proposal;
use App\Models\ProposalEvent;
use Illuminate\Http\Request;

class PublicProposalController extends Controller
{
    use ApiResponse;

    public function show(string $token)
    {
        $proposal = Proposal::where('share_token', $token)->first();

        if (! $proposal) {
            abort(404);
        }

        $accountSettings = AppSetting::findForAccount($proposal->user_id);
        $creatorSettings = $proposal->created_by_user_id
            ? AppSetting::findForUser($proposal->created_by_user_id)
            : null;
        $settings = $this->mergeEffectiveSettings($accountSettings, $creatorSettings);

        $validityDays = (int) ($settings?->defaults['validityDays'] ?? 7);
        $proposalDate = $proposal->date ?? $proposal->created_at;
        $validTill = $proposalDate->copy()->addDays($validityDays);

        if (now()->greaterThan($validTill)) {
            return response()->view('proposal-expired', [], 410);
        }

        $client = Client::find($proposal->client_id);
        $company = is_array($settings?->company) ? $settings->company : [];
        $payment = is_array($settings?->payment) ? $settings->payment : [];
        $defaults = is_array($settings?->defaults) ? $settings->defaults : [];

        $kyc = is_array($defaults['kyc'] ?? null) ? $defaults['kyc'] : [];
        $gstRate = $defaults['gstRate'] ?? 18;
        $billingTypes = is_array($defaults['billingTypes'] ?? null) && count($defaults['billingTypes']) > 0
            ? $defaults['billingTypes']
            : $this->defaultBillingTypes();

        return response()->view('proposal-public', [
            'token' => $token,
            'proposal' => $proposal,
            'client' => $client,
            'company' => $company,
            'payment' => $payment,
            'lineItems' => $this->lineItemsFromSnapshot($proposal->line_items_snapshot),
            'contentBlocks' => $this->resolveContentBlocks($proposal, $settings),
            'validTill' => $validTill,
            'kyc' => $kyc,
            'gstRate' => $gstRate,
            'billingTypes' => $billingTypes,
            'upiQrUrl' => $this->upiQrUrl($payment, $company),
            'amountInWords' => $this->amountInWords((float) $proposal->amount),
            'clientResponse' => $this->clientResponse($proposal->id),
        ]);
    }

    public function trackView(Request $request, string $token)
    {
        $proposal = Proposal::where('share_token', $token)->first();

        if ($proposal) {
            ProposalEvent::create([
                'proposal_id' => $proposal->id,
                'user_id' => null,
                'type' => ProposalEvent::TYPE_PUBLIC_VIEWED,
                'meta' => null,
            ]);
        }

        return response()->json(['message' => 'ok']);
    }

    public function respond(Request $request, string $token)
    {
        $proposal = Proposal::where('share_token', $token)->first();

        if (! $proposal) {
            abort(404);
        }

        $data = $request->validate([
            'action' => 'required|in:accept,reject',
        ]);

        $existing = $this->clientResponse($proposal->id);
        if ($existing) {
            return response()->json($existing + ['alreadyResponded' => true]);
        }

        $type = $data['action'] === 'accept' ? ProposalEvent::TYPE_CLIENT_ACCEPTED : ProposalEvent::TYPE_CLIENT_REJECTED;

        $event = ProposalEvent::create([
            'proposal_id' => $proposal->id,
            'user_id' => null,
            'type' => $type,
            'meta' => null,
        ]);

        $proposal->status = $data['action'] === 'accept' ? 'Accepted' : 'Rejected';
        $proposal->status_updated_at = now();
        $proposal->save();

        return response()->json([
            'status' => $data['action'] === 'accept' ? 'accepted' : 'rejected',
            'respondedAt' => $event->created_at?->toIso8601String(),
            'alreadyResponded' => false,
        ]);
    }

    /** Latest client accept/reject event for a proposal, in public-response shape (or null). */
    private function clientResponse(string $proposalId): ?array
    {
        $event = ProposalEvent::where('proposal_id', $proposalId)
            ->whereIn('type', [ProposalEvent::TYPE_CLIENT_ACCEPTED, ProposalEvent::TYPE_CLIENT_REJECTED])
            ->orderByDesc('created_at')
            ->first();

        if (! $event) {
            return null;
        }

        return [
            'status' => $event->type === ProposalEvent::TYPE_CLIENT_ACCEPTED ? 'accepted' : 'rejected',
            'respondedAt' => $event->created_at?->toIso8601String(),
        ];
    }

    private function upiQrUrl(array $payment, array $company): ?string
    {
        if (empty($payment['upi'])) {
            return null;
        }

        $upiString = 'upi://pay?'.http_build_query([
            'pa' => $payment['upi'],
            'pn' => $company['name'] ?: 'Payment',
            'cu' => 'INR',
        ]);

        return 'https://api.qrserver.com/v1/create-qr-code/?size=110x110&margin=1&data='.urlencode($upiString);
    }

    private function defaultBillingTypes(): array
    {
        return [
            ['value' => 'monthly', 'label' => 'Monthly', 'shortLabel' => '/mo'],
            ['value' => 'quarterly', 'label' => 'Quarterly', 'shortLabel' => '/qtr'],
            ['value' => 'annual', 'label' => 'Annual', 'shortLabel' => '/yr'],
            ['value' => 'one-time', 'label' => 'One-time', 'shortLabel' => 'once'],
        ];
    }

    /** Convert an amount to Indian-numbering words, e.g. "Twenty Nine Thousand Five Hundred Rupees Only". */
    private function amountInWords(float $amount): string
    {
        $n = (int) round($amount);
        if ($n === 0) {
            return 'Zero Rupees Only';
        }

        $ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
            'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
            'Seventeen', 'Eighteen', 'Nineteen'];
        $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        $convert = function (int $num) use (&$convert, $ones, $tens): string {
            if ($num === 0) {
                return '';
            }
            if ($num < 20) {
                return $ones[$num];
            }
            if ($num < 100) {
                return trim($tens[intdiv($num, 10)].($num % 10 ? ' '.$ones[$num % 10] : ''));
            }
            if ($num < 1000) {
                return trim($ones[intdiv($num, 100)].' Hundred'.($num % 100 ? ' '.$convert($num % 100) : ''));
            }
            if ($num < 100000) {
                return trim($convert(intdiv($num, 1000)).' Thousand'.($num % 1000 ? ' '.$convert($num % 1000) : ''));
            }
            if ($num < 10000000) {
                return trim($convert(intdiv($num, 100000)).' Lakh'.($num % 100000 ? ' '.$convert($num % 100000) : ''));
            }

            return trim($convert(intdiv($num, 10000000)).' Crore'.($num % 10000000 ? ' '.$convert($num % 10000000) : ''));
        };

        return $convert($n).' Rupees Only';
    }

    private function lineItemsFromSnapshot(?array $snapshot): array
    {
        if (! $snapshot) {
            return [];
        }

        return array_map(fn (array $item) => [
            'productName' => $item['productName'] ?? '',
            'productColor' => $item['productColor'] ?? null,
            'planName' => $item['planName'] ?? '',
            'planDescription' => $item['planDescription'] ?? '',
            'billing' => $item['billing'] ?? null,
            'features' => $item['features'] ?? [],
            'mrp' => (float) ($item['mrp'] ?? 0),
            'repDiscount' => (float) ($item['repDiscount'] ?? 0),
            'frequencyDiscount' => (float) ($item['frequencyDiscount'] ?? 0),
            'final' => (float) ($item['final'] ?? 0),
            'showcasePlans' => array_map(fn (array $p) => [
                'planName' => $p['planName'] ?? '',
                'planDescription' => $p['planDescription'] ?? '',
                'billing' => $p['billing'] ?? null,
                'features' => $p['features'] ?? [],
                'mrp' => (float) ($p['mrp'] ?? 0),
            ], $item['showcasePlans'] ?? []),
        ], $snapshot);
    }

    private function resolveContentBlocks(Proposal $proposal, ?AppSetting $settings): array
    {
        if (is_array($proposal->content_blocks) && count($proposal->content_blocks) > 0) {
            return $proposal->content_blocks;
        }

        $defaults = is_array($settings?->defaults) ? $settings->defaults : [];

        if (is_array($defaults['contentBlocks'] ?? null)) {
            return array_values(array_filter(
                $defaults['contentBlocks'],
                fn ($block) => $block['enabled'] ?? true
            ));
        }

        if (is_array($defaults['terms'] ?? null) && count($defaults['terms']) > 0) {
            return [[
                'id' => 'terms_legacy',
                'title' => 'Terms & Conditions',
                'content' => $defaults['terms'],
            ]];
        }

        return [];
    }
}
