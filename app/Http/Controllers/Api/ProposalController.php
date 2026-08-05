<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\AppSetting;
use App\Models\Proposal;
use App\Models\ProposalEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProposalController extends Controller
{
    use ApiResponse;
    use AuthorizesAccount;

    public function store(Request $request)
    {
        $this->authorizeSection($request, 'proposals', 'write');
        $proposal = $this->upsert($request);

        return response()->json($this->proposalPayload($proposal), 201);
    }

    public function update(Request $request, string $id)
    {
        $this->authorizeSection($request, 'proposals', 'write');
        $request->merge(['id' => $id]);
        $proposal = $this->upsert($request);

        return response()->json($this->proposalPayload($proposal));
    }

    public function destroy(Request $request, string $id)
    {
        $this->authorizeSection($request, 'proposals', 'write');
        $this->findAccountProposal($request, $id)->delete();

        return response()->json(null, 204);
    }

    public function events(Request $request, string $id)
    {
        $this->authorizeSection($request, 'proposals', 'read');
        $proposal = $this->findAccountProposal($request, $id);

        $events = ProposalEvent::with('user')
            ->where('proposal_id', $proposal->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json($events->map(fn (ProposalEvent $event) => [
            'id' => $event->id,
            'type' => $event->type,
            'meta' => $event->meta,
            'createdAt' => $event->created_at?->toIso8601String(),
            'userName' => $event->user?->name ?? ($event->user_id ? 'Deleted user' : null),
        ])->values());
    }

    protected function upsert(Request $request): Proposal
    {
        $accountId = $this->accountUserId($request);

        $user = $this->currentUser($request);

        $clientExistsRule = Rule::exists('clients', 'id')->where(function ($q) use ($accountId, $user) {
            $q->where('user_id', $accountId);
            if (! $user->isAdmin()) {
                $q->where('created_by_user_id', $user->id);
            }
        });

        $data = $request->validate([
            'id' => 'required|string|max:64',
            'clientId' => [
                'required',
                'string',
                $clientExistsRule,
            ],
            'products' => 'required|array',
            'amount' => 'required|numeric',
            'subtotal' => 'nullable|numeric',
            'gst' => 'nullable|numeric',
            'status' => 'required|string|max:32',
            'date' => 'nullable|date',
            'repId' => 'nullable|string|max:64',
            'frequency' => 'nullable|string|max:64',
            'extrasHeading' => 'nullable|string|max:255',
            'extrasText' => 'nullable|string',
            'paymentLink' => 'nullable|url|max:512',
            'contentBlocks' => 'nullable|array',
            'lineItemsSnapshot' => 'nullable|array',
            'statusUpdatedAt' => 'nullable|date',
            'createdAt' => 'nullable|date',
        ]);

        $settings = AppSetting::findForAccount($accountId);
        $proposalId = $data['id'];
        $proposal = Proposal::find($proposalId);

        if ($proposal && (int) $proposal->user_id === (int) $accountId) {
            if (! $user->isAdmin() && (int) $proposal->created_by_user_id !== (int) $user->id) {
                abort(403, 'You do not have permission for this proposal.');
            }
        } elseif (Proposal::where('id', $proposalId)->exists()) {
            $proposalId = $this->nextProposalId($accountId, $settings);
            $proposal = new Proposal(['id' => $proposalId]);
            $proposal->created_by_user_id = $user->id;
        } else {
            $proposal = new Proposal(['id' => $proposalId]);
            $proposal->created_by_user_id = $user->id;
        }

        $proposal->fill([
                'client_id' => $data['clientId'],
                'products' => $data['products'],
                'amount' => $data['amount'],
                'subtotal' => $data['subtotal'] ?? null,
                'gst' => $data['gst'] ?? null,
                'status' => $data['status'],
                'date' => $data['date'] ?? now()->toDateString(),
                'rep_id' => $data['repId'] ?? null,
                'frequency' => $data['frequency'] ?? null,
                'extras_heading' => $data['extrasHeading'] ?? null,
                'extras_text' => $data['extrasText'] ?? null,
                'payment_link' => $data['paymentLink'] ?? null,
                'content_blocks' => $data['contentBlocks'] ?? null,
                'line_items_snapshot' => $data['lineItemsSnapshot'] ?? null,
                'status_updated_at' => $data['statusUpdatedAt'] ?? null,
                'created_at_custom' => $data['createdAt'] ?? ($proposal->created_at_custom ?? now()),
        ]);

        $proposal->user_id = $accountId;
        if (! $proposal->share_token) {
            $proposal->share_token = Str::random(32);
        }
        $proposal->save();

        return $proposal->fresh();
    }
}
