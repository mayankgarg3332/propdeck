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

        return response()->view('proposal-public', [
            'token' => $token,
            'proposal' => $proposal,
            'client' => $client,
            'company' => $company,
            'payment' => $payment,
            'lineItems' => $this->lineItemsFromSnapshot($proposal->line_items_snapshot),
            'contentBlocks' => $this->resolveContentBlocks($proposal, $settings),
            'validTill' => $validTill,
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

    private function lineItemsFromSnapshot(?array $snapshot): array
    {
        if (! $snapshot) {
            return [];
        }

        return array_map(fn (array $item) => [
            'productName' => $item['productName'] ?? '',
            'planName' => $item['planName'] ?? '',
            'planDescription' => $item['planDescription'] ?? '',
            'features' => $item['features'] ?? [],
            'mrp' => (float) ($item['mrp'] ?? 0),
            'repDiscount' => (float) ($item['repDiscount'] ?? 0),
            'final' => (float) ($item['final'] ?? 0),
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
