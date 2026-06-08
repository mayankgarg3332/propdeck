<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\AppSetting;
use App\Models\Proposal;
use App\Services\AccountMailer;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ProposalEmailController extends Controller
{
    use ApiResponse;
    use AuthorizesAccount;

    public function send(Request $request)
    {
        $this->authorizeSection($request, 'proposals', 'write');

        $data = $request->validate([
            'to'         => 'required|email|max:255',
            'subject'    => 'required|string|max:255',
            'htmlBody'   => 'required|string|max:500000',
            'proposalId' => 'nullable|string|max:64',
            'cc'         => 'nullable|array|max:20',
            'cc.*'       => 'email|max:255',
        ]);

        $user = $this->currentUser($request);
        $accountId = $this->accountUserId($request);

        // Use the sub-user's own SMTP config if they have one, otherwise fall back to account.
        $accountSettings = AppSetting::findForAccount($accountId);
        $userSettings = AppSetting::findForUser($user->id);
        $effectiveSettings = $this->mergeEffectiveSettings($accountSettings, $userSettings);
        $emailConfig = $effectiveSettings?->email;

        try {
            $cc = array_values(array_filter($data['cc'] ?? [], fn ($addr) => $addr !== $data['to']));
            AccountMailer::send($emailConfig, $data['to'], $data['subject'], $data['htmlBody'], $cc);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (! empty($data['proposalId'])) {
            $proposal = Proposal::query()
                ->where('user_id', $accountId)
                ->where('id', $data['proposalId'])
                ->first();

            if ($proposal) {
                $proposal->update([
                    'status' => 'Sent',
                    'status_updated_at' => now(),
                ]);
            }
        }

        return response()->json(['message' => 'Email sent successfully.']);
    }
}
