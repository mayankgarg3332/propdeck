<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\AppSetting;
use App\Models\Client;
use App\Models\Proposal;
use App\Models\User;
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
            $cc = $data['cc'] ?? [];

            // Server-side enforcement: always include admin-set defaultCc addresses.
            // Prevents UI bypass — sub-users cannot strip these by tampering the request.
            $accountDefaultCc = is_array($accountSettings?->email['defaultCc'] ?? null)
                ? $accountSettings->email['defaultCc']
                : [];
            $cc = array_values(array_unique(array_merge($accountDefaultCc, $cc)));

            // Remove To address from CC
            $cc = array_values(array_filter($cc, fn ($addr) => $addr !== $data['to']));

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

    public function notifyPdfDownload(Request $request)
    {
        $this->authorizeSection($request, 'proposals', 'read');

        $data = $request->validate([
            'proposalId'    => 'required|string|max:64',
            'clientName'    => 'nullable|string|max:255',
            'clientEmail'   => 'nullable|email|max:255',
            'date'          => 'nullable|string|max:32',
            'lineItems'     => 'nullable|array',
            'totals'        => 'nullable|array',
            'frequency'     => 'nullable|string|max:64',
            'downloadedBy'  => 'nullable|string|max:255',
        ]);

        $user = $this->currentUser($request);
        $accountId = $this->accountUserId($request);

        $accountSettings = AppSetting::findForAccount($accountId);
        $userSettings = AppSetting::findForUser($user->id);
        $effectiveSettings = $this->mergeEffectiveSettings($accountSettings, $userSettings);
        $emailConfig = $effectiveSettings?->email;

        // Only send if defaultCc is configured — no-op otherwise
        $defaultCc = is_array($accountSettings?->email['defaultCc'] ?? null)
            ? array_filter($accountSettings->email['defaultCc'], fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL))
            : [];
        $defaultCc = array_values($defaultCc);

        if (empty($defaultCc)) {
            return response()->json(['message' => 'No default CC configured — notification skipped.']);
        }

        $company = is_array($accountSettings?->company) ? $accountSettings->company : [];
        $companyName = $company['name'] ?? 'PropDeck';

        $html = $this->buildPdfNotificationHtml($data, $companyName);
        $subject = "PDF Downloaded: Proposal {$data['proposalId']}";

        try {
            // Send to each defaultCc address; first address is "To", rest are CC
            $to = $defaultCc[0];
            $cc = array_slice($defaultCc, 1);
            AccountMailer::send($emailConfig, $to, $subject, $html, $cc);
        } catch (InvalidArgumentException $e) {
            // Don't fail the PDF download if notification email fails
            return response()->json(['message' => 'Notification skipped: ' . $e->getMessage()]);
        }

        return response()->json(['message' => 'PDF download notification sent.']);
    }

    private function buildPdfNotificationHtml(array $data, string $companyName): string
    {
        $proposalId  = htmlspecialchars($data['proposalId'] ?? '');
        $clientName  = htmlspecialchars($data['clientName'] ?? 'N/A');
        $clientEmail = htmlspecialchars($data['clientEmail'] ?? '');
        $date        = htmlspecialchars($data['date'] ?? date('Y-m-d'));
        $frequency   = htmlspecialchars($data['frequency'] ?? '');
        $downloadedBy = htmlspecialchars($data['downloadedBy'] ?? 'Unknown');

        $lineItems = $data['lineItems'] ?? [];
        $totals    = $data['totals'] ?? [];

        $subtotal = number_format((float) ($totals['subtotal'] ?? 0), 2);
        $gst      = number_format((float) ($totals['gst'] ?? 0), 2);
        $total    = number_format((float) ($totals['total'] ?? 0), 2);

        $itemRows = '';
        foreach ($lineItems as $item) {
            $product  = htmlspecialchars($item['product']['name'] ?? '');
            $plan     = htmlspecialchars($item['plan']['name'] ?? '');
            $mrp      = number_format((float) ($item['mrp'] ?? 0), 2);
            $discount = number_format((float) ($item['repDiscount'] ?? 0), 2);
            $final    = number_format((float) ($item['final'] ?? 0), 2);
            $itemRows .= "
            <tr>
              <td style='padding:10px 14px;border-bottom:1px solid #e5e7eb;'>
                <div style='font-weight:600;color:#111827;'>{$product}</div>
                <div style='font-size:12px;color:#6b7280;'>{$plan}</div>
              </td>
              <td style='padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;'>₹{$mrp}</td>
              <td style='padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;color:#ef4444;'>-₹{$discount}</td>
              <td style='padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827;'>₹{$final}</td>
            </tr>";
        }

        $clientEmailHtml = $clientEmail
            ? "<div style='font-size:12px;color:#6b7280;'>{$clientEmail}</div>"
            : '';
        $frequencyHtml = $frequency ? "
              <tr>
                <td colspan='2' style='padding:12px 16px;'>
                  <span style='font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;'>Billing</span>
                  <div style='font-size:14px;color:#111827;margin-top:2px;'>{$frequency}</div>
                </td>
              </tr>" : '';
        $itemTableHtml = $itemRows ? "
            <h3 style='margin:0 0 10px;font-size:14px;color:#111827;font-weight:600;'>Plan Breakdown</h3>
            <table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;'>
              <thead>
                <tr style='background:#f9fafb;'>
                  <th style='padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;'>Product / Plan</th>
                  <th style='padding:10px 14px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;'>MRP</th>
                  <th style='padding:10px 14px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;'>Discount</th>
                  <th style='padding:10px 14px;text-align:right;font-size:12px;font-weight:600;color:#6b7280;'>Final</th>
                </tr>
              </thead>
              <tbody>{$itemRows}</tbody>
            </table>" : '';

        return <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1d9e75;padding:24px 32px;">
            <div style="font-size:18px;font-weight:700;color:#fff;">{$companyName}</div>
            <div style="font-size:13px;color:#a7f3d0;margin-top:4px;">PDF Proposal Downloaded</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 0;">
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">
              A proposal PDF was downloaded. Details below.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Proposal ID</span>
                  <div style="font-size:15px;font-weight:700;color:#111827;margin-top:2px;">{$proposalId}</div>
                </td>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Date</span>
                  <div style="font-size:15px;font-weight:700;color:#111827;margin-top:2px;">{$date}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Client</span>
                  <div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;">{$clientName}</div>
                  {$clientEmailHtml}
                </td>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <span style="font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Downloaded By</span>
                  <div style="font-size:15px;font-weight:600;color:#111827;margin-top:2px;">{$downloadedBy}</div>
                </td>
              </tr>
              {$frequencyHtml}
            </table>

            {$itemTableHtml}

            <table width='100%' cellpadding='0' cellspacing='0' style='background:#ecfdf5;border-radius:8px;border:1px solid #6ee7b7;margin-bottom:28px;'>
              <tr>
                <td style='padding:10px 16px;font-size:13px;color:#374151;'>Subtotal</td>
                <td style='padding:10px 16px;text-align:right;font-size:13px;color:#374151;'>₹{$subtotal}</td>
              </tr>
              <tr>
                <td style='padding:6px 16px;font-size:13px;color:#374151;'>GST</td>
                <td style='padding:6px 16px;text-align:right;font-size:13px;color:#374151;'>₹{$gst}</td>
              </tr>
              <tr>
                <td style='padding:10px 16px;font-size:15px;font-weight:700;color:#065f46;border-top:1px solid #6ee7b7;'>Total</td>
                <td style='padding:10px 16px;text-align:right;font-size:15px;font-weight:700;color:#065f46;border-top:1px solid #6ee7b7;'>₹{$total}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">This is an automated notification from {$companyName} · PropDeck</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
    }
}
