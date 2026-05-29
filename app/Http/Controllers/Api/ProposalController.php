<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\AppSetting;
use App\Models\Proposal;
use Illuminate\Http\Request;
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

    protected function upsert(Request $request): Proposal
    {
        $accountId = $this->accountUserId($request);

        $data = $request->validate([
            'id' => 'required|string|max:64',
            'clientId' => [
                'required',
                'string',
                Rule::exists('clients', 'id')->where(fn ($q) => $q->where('user_id', $accountId)),
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
            'lineItemsSnapshot' => 'nullable|array',
            'statusUpdatedAt' => 'nullable|date',
            'createdAt' => 'nullable|date',
        ]);

        $user = $this->currentUser($request);

        $settings = AppSetting::findForAccount($accountId);
        $proposalId = $data['id'];
        $proposal = Proposal::find($proposalId);

        if ($proposal && (int) $proposal->user_id === (int) $accountId) {
            // Update this account's existing proposal.
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
                'line_items_snapshot' => $data['lineItemsSnapshot'] ?? null,
                'status_updated_at' => $data['statusUpdatedAt'] ?? null,
                'created_at_custom' => $data['createdAt'] ?? ($proposal->created_at_custom ?? now()),
        ]);

        $proposal->user_id = $accountId;
        $proposal->save();

        return $proposal->fresh();
    }
}
