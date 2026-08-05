<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{{ $proposal->id }} — Proposal from {{ $company['name'] ?? 'PropDeck' }}</title>
<meta property="og:title" content="Proposal {{ $proposal->id }} from {{ $company['name'] ?? 'PropDeck' }}">
<meta property="og:description" content="{{ $client->agency ?? 'Your' }} proposal — total {{ '₹' . number_format($proposal->amount, 0) }}. Valid till {{ $validTill->format('d M Y') }}.">
<meta property="og:site_name" content="PropDeck">
<style>
  :root {
    --accent: {{ $company['proposalHeaderColor'] ?? '#0f6e56' }};
    --accent-bg: color-mix(in srgb, var(--accent) 8%, white);
    --accent-badge-bg: color-mix(in srgb, var(--accent) 15%, white);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f3f4f6;
    color: #111827;
  }
  .wrap { max-width: 680px; margin: 0 auto; padding: 0 0 40px; }
  .header {
    background: var(--accent);
    color: #fff;
    padding: 28px 24px;
  }
  .header .company { font-size: 20px; font-weight: 700; }
  .header .tagline { margin-top: 3px; font-size: 12px; color: rgba(255,255,255,0.7); }
  .header .subtitle { margin-top: 4px; font-size: 13px; color: rgba(255,255,255,0.75); }
  .info-strip {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    padding: 14px 24px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .info-strip .label { font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .05em; }
  .info-strip .value { font-size: 12px; font-weight: 600; color: #111827; margin-top: 3px; }
  .greeting { padding: 20px 20px 0; font-size: 14px; color: #374151; line-height: 1.7; }
  .greeting strong { color: #111827; }
  .about-text { padding: 8px 20px 0; font-size: 13px; color: #6b7280; line-height: 1.7; }
  .card { background: #fff; margin: 16px; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .hero { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
  .hero .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #9ca3af; }
  .hero strong { display: block; font-size: 16px; margin-top: 2px; }
  .hero .amount { font-size: 24px; font-weight: 800; color: var(--accent); }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  th { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  td.num, th.num { text-align: right; }
  .totals { margin-top: 12px; border-top: 2px solid #f3f4f6; padding-top: 10px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .totals-row.total { font-weight: 800; font-size: 17px; color: var(--accent); border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 10px; }
  .block-title { font-weight: 700; margin: 0 0 8px; font-size: 14px; }
  .block ol { margin: 0; padding-left: 18px; font-size: 13px; color: #374151; }
  .block li { margin-bottom: 4px; }
  .pay-btn { display: inline-block; background: var(--accent); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; margin-top: 8px; }
  .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 20px; }
  .footer .footer-name { color: var(--accent); font-weight: 700; font-size: 13px; margin-bottom: 4px; }
  .footer .footer-line { margin-bottom: 3px; }
  .valid-till { font-size: 12px; color: #9ca3af; margin-top: 4px; }

  .product-block { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
  .product-block:last-child { margin-bottom: 0; }
  .product-block-head { border-left: 4px solid var(--accent); padding: 12px 16px; background: #fafafa; }
  .product-block-head .name { font-size: 15px; font-weight: 700; color: #111827; }
  .product-block-head .sub { color: #6b7280; font-size: 12px; margin-top: 2px; }
  .plan-badge { display: inline-block; background: var(--accent-badge-bg); color: var(--accent); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-left: 8px; }
  .single-plan-body { padding: 10px 16px 12px; background: #fff; display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .single-plan-features { flex: 1; min-width: 200px; }
  .single-plan-price { text-align: right; white-space: nowrap; }
  .single-plan-price .mrp { text-decoration: line-through; color: #9ca3af; font-size: 12px; margin-right: 4px; }
  .single-plan-price .final { font-size: 17px; font-weight: 800; color: var(--accent); }
  .single-plan-price .billing { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  .feature-row { padding: 2px 0; font-size: 12px; color: #374151; }
  .feature-row .tick { color: var(--accent); font-weight: 700; margin-right: 5px; }

  .plan-grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px 14px; background: #fff; }
  .plan-col {
    flex: 1 1 150px;
    min-width: 150px;
    padding: 12px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
  }
  .plan-col.recommended { border: 2px solid var(--accent); background: var(--accent-bg); }
  .plan-col .recommended-badge {
    display: inline-block; background: var(--accent); color: #fff; font-size: 10px; font-weight: 700;
    padding: 2px 8px; border-radius: 999px; margin-bottom: 6px;
  }
  .plan-col .plan-name { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 2px; }
  .plan-col .plan-desc { font-size: 11px; color: #6b7280; margin-bottom: 8px; }
  .plan-col .plan-mrp { text-decoration: line-through; color: #9ca3af; font-size: 11px; }
  .plan-col .plan-price { font-size: 15px; font-weight: 800; color: #374151; margin-bottom: 2px; }
  .plan-col.recommended .plan-price { color: var(--accent); }
  .plan-col .plan-billing { font-size: 10px; color: #9ca3af; margin-bottom: 8px; }
  .plan-col .feature-row { color: #6b7280; }
  .plan-col.recommended .feature-row { color: #374151; }
  .plan-col .feature-row .tick { color: #9ca3af; }
  .plan-col.recommended .feature-row .tick { color: var(--accent); }

  .total-payable { background: var(--accent); border-radius: 8px; padding: 14px 16px; margin-top: 14px; }
  .total-payable-row { display: flex; justify-content: space-between; align-items: center; }
  .total-payable-row .tp-label { color: #fff; font-weight: 700; font-size: 14px; }
  .total-payable-row .tp-amount { color: #fff; font-weight: 800; font-size: 20px; }
  .total-payable-words { color: rgba(255,255,255,0.8); font-size: 11px; padding-top: 4px; }
  .disclaimer { margin: 10px 0 0; font-size: 11px; color: #9ca3af; }

  .accent-box { border: 1.5px solid var(--accent); border-radius: 8px; overflow: hidden; background: var(--accent-bg); }
  .accent-box-inner { border-left: 4px solid var(--accent); padding: 16px; }
  .accent-box-inner .box-title { font-size: 14px; font-weight: 700; color: var(--accent); margin-bottom: 8px; }

  .amber-box { border: 1.5px solid #f59e0b; border-radius: 8px; overflow: hidden; background: #fffbeb; }
  .amber-box-inner { border-left: 4px solid #f59e0b; padding: 14px 16px; }
  .kyc-item { padding: 3px 0; font-size: 13px; color: #92400e; }

  .payment-grid { display: flex; flex-wrap: wrap; gap: 16px; }
  .payment-col { flex: 1 1 200px; min-width: 200px; }
  .payment-col .p-label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; }
  .payment-col .p-value { font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 10px; }
  .upi-row { border-top: 1px solid #e5e7eb; margin-top: 14px; padding-top: 14px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .upi-row img { display: block; border-radius: 6px; border: 1px solid #e5e7eb; }
  .upi-row .upi-title { font-size: 11px; font-weight: 700; color: var(--accent); margin-bottom: 4px; }
  .upi-row .upi-id { font-size: 12px; font-weight: 600; color: #111827; word-break: break-all; margin-bottom: 4px; }
  .upi-row .upi-hint { font-size: 10px; color: #6b7280; }

  .signature-block { padding-top: 4px; }
  .signature-block .sig-name { font-weight: 700; color: #111827; font-size: 14px; }
  .signature-block .sig-role { color: #6b7280; font-size: 12px; margin-top: 2px; }
  .signature-block .sig-contact { margin-top: 6px; font-size: 12px; color: #6b7280; }

  .respond-card { text-align: center; }
  .respond-card .block-title { margin-bottom: 4px; }
  .respond-card .respond-hint { color: #6b7280; font-size: 13px; margin: 0 0 16px; }
  .respond-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .respond-btn {
    display: inline-flex; align-items: center; gap: 8px;
    border: none; border-radius: 8px; padding: 13px 32px;
    font-size: 14px; font-weight: 700; cursor: pointer;
    font-family: inherit;
  }
  .respond-btn.accept { background: #0f6e56; color: #fff; }
  .respond-btn.reject { background: #fff; color: #dc2626; border: 1.5px solid #fecaca; }
  .respond-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .respond-status {
    display: none; margin-top: 16px; padding: 12px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 600;
  }
  .respond-status.accepted { display: block; background: #e1f5ee; color: #0f6e56; }
  .respond-status.rejected { display: block; background: #fef2f2; color: #dc2626; }
  .respond-error {
    display: none; margin-top: 12px; color: #dc2626; font-size: 12px;
  }

  @media (max-width: 480px) {
    .info-strip { grid-template-columns: repeat(2, 1fr); row-gap: 14px; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="company">{{ $company['name'] ?? 'PropDeck' }}</div>
    @if(!empty($company['tagline']))
      <div class="tagline">{{ $company['tagline'] }}</div>
    @endif
    <div class="subtitle">Proposal {{ $proposal->id }} · {{ optional($proposal->date)->format('d M Y') }}</div>
  </div>

  <div class="info-strip">
    <div>
      <div class="label">Prepared By</div>
      <div class="value">{{ $company['signatory'] ?? '—' }}</div>
    </div>
    <div>
      <div class="label">Prepared For</div>
      <div class="value">{{ $client->agency ?? '—' }}</div>
    </div>
    <div>
      <div class="label">Date</div>
      <div class="value">{{ optional($proposal->date)->format('d M Y') ?? '—' }}</div>
    </div>
    <div>
      <div class="label">Valid Till</div>
      <div class="value">{{ $validTill->format('d M Y') }}</div>
    </div>
  </div>

  <div class="greeting">Dear <strong>{{ $client->contact ?? 'Sir/Madam' }}</strong>,</div>
  @if(!empty($company['about']))
    <div class="about-text">{{ $company['about'] }}</div>
  @endif

  <div class="card">
    <div class="block-title">Products &amp; Plans</div>

    @if(count($lineItems) > 0)
      @php $billingLabel = function ($value) use ($billingTypes) {
        if (!$value) return '';
        foreach ($billingTypes as $t) {
          if (($t['value'] ?? null) === $value) return $t['label'] ?? $value;
        }
        return $value;
      }; @endphp

      @foreach($lineItems as $item)
        @php
          $disc = ($item['repDiscount'] ?? 0) + ($item['frequencyDiscount'] ?? 0);
          $showcase = $item['showcasePlans'] ?? [];
          $hasComparison = count($showcase) > 0;
        @endphp
        <div class="product-block">
          <div class="product-block-head" style="border-left-color: {{ $item['productColor'] ?? 'var(--accent)' }};">
            <span class="name">{{ $item['productName'] }}</span>
            @if(!$hasComparison && $item['planName'])
              <span class="plan-badge">{{ $item['planName'] }}</span>
            @endif
            @if($hasComparison)
              <div class="sub">Choose the plan that works for you</div>
            @elseif($item['planDescription'])
              <div class="sub">{{ $item['planDescription'] }}</div>
            @endif
          </div>

          @if(!$hasComparison)
            <div class="single-plan-body">
              <div class="single-plan-features">
                @foreach(($item['features'] ?? []) as $feature)
                  <div class="feature-row"><span class="tick">&#10003;</span>{{ $feature }}</div>
                @endforeach
              </div>
              <div class="single-plan-price">
                @if($disc > 0)
                  <span class="mrp">&#8377;{{ number_format($item['mrp'], 0) }}</span>
                @endif
                <div class="final">&#8377;{{ number_format($item['final'], 0) }}</div>
                @if($item['billing'])
                  <div class="billing">{{ $billingLabel($item['billing']) }}</div>
                @endif
              </div>
            </div>
          @else
            <div class="plan-grid">
              <div class="plan-col recommended">
                <div class="recommended-badge">&#11088; Recommended</div>
                <div class="plan-name">{{ $item['planName'] }}</div>
                @if($item['planDescription'])<div class="plan-desc">{{ $item['planDescription'] }}</div>@endif
                @if($disc > 0)<div class="plan-mrp">&#8377;{{ number_format($item['mrp'], 0) }}</div>@endif
                <div class="plan-price">&#8377;{{ number_format($item['final'], 0) }}</div>
                @if($item['billing'])<div class="plan-billing">{{ $billingLabel($item['billing']) }}</div>@endif
                @foreach(($item['features'] ?? []) as $feature)
                  <div class="feature-row"><span class="tick">&#10003;</span>{{ $feature }}</div>
                @endforeach
              </div>
              @foreach($showcase as $plan)
                <div class="plan-col">
                  <div class="plan-name">{{ $plan['planName'] }}</div>
                  @if($plan['planDescription'])<div class="plan-desc">{{ $plan['planDescription'] }}</div>@endif
                  <div class="plan-price">&#8377;{{ number_format($plan['mrp'], 0) }}</div>
                  @if($plan['billing'])<div class="plan-billing">{{ $billingLabel($plan['billing']) }}</div>@endif
                  @foreach(($plan['features'] ?? []) as $feature)
                    <div class="feature-row"><span class="tick">&#10003;</span>{{ $feature }}</div>
                  @endforeach
                </div>
              @endforeach
            </div>
          @endif
        </div>
      @endforeach
    @else
      <ul style="padding-left: 18px; font-size: 13px; color: #374151;">
        @foreach($proposal->products as $product)
          <li>{{ $product }}</li>
        @endforeach
      </ul>
    @endif

    <div class="totals">
      @if($proposal->subtotal !== null)
        <div class="totals-row"><span>Subtotal</span><span>&#8377;{{ number_format($proposal->subtotal, 0) }}</span></div>
      @endif
      @if($proposal->gst !== null)
        <div class="totals-row"><span>GST ({{ $gstRate }}%)</span><span>&#8377;{{ number_format($proposal->gst, 0) }}</span></div>
      @endif
      <div class="totals-row total"><span>Total</span><span>&#8377;{{ number_format($proposal->amount, 0) }}</span></div>
    </div>

    <div class="total-payable">
      <div class="total-payable-row">
        <span class="tp-label">TOTAL PAYABLE</span>
        <span class="tp-amount">&#8377;{{ number_format($proposal->amount, 0) }}</span>
      </div>
      <div class="total-payable-words">{{ $amountInWords }}</div>
    </div>
    <div class="disclaimer">Prices in INR. GST @ {{ $gstRate }}% applicable. Frequency: {{ $proposal->frequency ?: 'monthly' }}.</div>
  </div>

  @if($proposal->extras_text)
    <div class="card">
      <div class="accent-box">
        <div class="accent-box-inner">
          <div class="box-title">{{ $proposal->extras_heading ?: 'Complimentary / Extras' }}</div>
          <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;line-height:1.6;">{{ $proposal->extras_text }}</p>
        </div>
      </div>
    </div>
  @endif

  @if($proposal->payment_link || !empty($payment))
    <div class="card">
      <div class="block-title">Payment</div>

      @if($proposal->payment_link)
        <div style="text-align:center;margin-bottom:16px;">
          <a class="pay-btn" href="{{ $proposal->payment_link }}" target="_blank" rel="noopener">Pay Now</a>
        </div>
      @endif

      @if(!empty($payment))
        <div class="payment-grid">
          <div class="payment-col">
            <div class="p-label">Bank</div>
            <div class="p-value">{{ $payment['bank'] ?? '—' }}</div>
            <div class="p-label">Account No</div>
            <div class="p-value">{{ $payment['account'] ?? '—' }}</div>
            <div class="p-label">IFSC</div>
            <div class="p-value">{{ $payment['ifsc'] ?? '—' }}</div>
          </div>
          <div class="payment-col">
            <div class="p-label">Account Holder</div>
            <div class="p-value">{{ $payment['holder'] ?? ($payment['bank'] ?? '—') }}</div>
            <div class="p-label">Account Type</div>
            <div class="p-value">{{ $payment['type'] ?? '—' }}</div>
          </div>
        </div>

        @if($upiQrUrl || !empty($payment['upi']))
          <div class="upi-row">
            @if($upiQrUrl)
              <img src="{{ $upiQrUrl }}" width="90" height="90" alt="UPI QR">
            @endif
            <div>
              <div class="upi-title">PAY VIA UPI</div>
              @if(!empty($payment['upi']))<div class="upi-id">{{ $payment['upi'] }}</div>@endif
              <div class="upi-hint">Scan with GPay · PhonePe · Paytm · any UPI app</div>
            </div>
          </div>
        @endif
      @endif
    </div>
  @endif

  @if(count($kyc) > 0)
    <div class="card">
      <div class="block-title">KYC Documents Required</div>
      <div class="amber-box">
        <div class="amber-box-inner">
          @foreach($kyc as $i => $doc)
            <div class="kyc-item">{{ $i + 1 }}. {{ $doc }}</div>
          @endforeach
        </div>
      </div>
    </div>
  @endif

  @foreach($contentBlocks as $block)
    @php $lines = array_values(array_filter($block['content'] ?? [], fn ($l) => trim((string) $l) !== '')); @endphp
    @if(($block['title'] ?? null) || count($lines) > 0)
      <div class="card block">
        @if($block['title'] ?? null)<div class="block-title">{{ $block['title'] }}</div>@endif
        @if(count($lines) > 0)
          <ol>
            @foreach($lines as $line)
              <li>{{ $line }}</li>
            @endforeach
          </ol>
        @endif
      </div>
    @endif
  @endforeach

  @if(!empty($company['signatory']))
    <div class="card">
      <div class="signature-block">
        <div class="sig-name">{{ $company['signatory'] }}</div>
        <div class="sig-role">{{ $company['designation'] ?? 'Sales Rep' }} · {{ $company['name'] ?? 'Propdeck' }}</div>
        @php $sigContact = array_filter([$company['phone'] ?? null, $company['email'] ?? null]); @endphp
        @if(count($sigContact) > 0)
          <div class="sig-contact">{{ implode(' · ', $sigContact) }}</div>
        @endif
      </div>
    </div>
  @endif

  <div class="card respond-card">
    <div class="block-title">Your Decision</div>
    <p class="respond-hint">Let us know if you'd like to proceed with this proposal.</p>
    <div class="respond-actions">
      <button type="button" class="respond-btn accept" id="respond-accept">&#10003; Accept Proposal</button>
      <button type="button" class="respond-btn reject" id="respond-reject">&#10005; Reject Proposal</button>
    </div>
    <div class="respond-status" id="respond-status"></div>
    <div class="respond-error" id="respond-error">Something went wrong — please try again.</div>
  </div>

  <div class="footer">
    <div class="footer-name">{{ $company['name'] ?? 'Propdeck' }}</div>
    @if(!empty($company['address']))
      <div class="footer-line">{{ str_replace("\n", ", ", $company['address']) }}</div>
    @endif
    @if(!empty($company['gst']))
      <div class="footer-line">GST No: {{ $company['gst'] }}</div>
    @endif
    <div class="footer-line">This proposal was shared via PropDeck on behalf of {{ $company['name'] ?? 'the sender' }}.</div>
    <div>&copy; {{ date('Y') }} {{ $company['name'] ?? 'Propdeck' }}. All rights reserved.</div>
  </div>
</div>
<script>
  fetch('/p/{{ $token }}/viewed', { method: 'POST', keepalive: true }).catch(function () {});

  (function () {
    var acceptBtn = document.getElementById('respond-accept');
    var rejectBtn = document.getElementById('respond-reject');
    var statusEl = document.getElementById('respond-status');
    var errorEl = document.getElementById('respond-error');

    function formatDate(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function setResponded(status, at) {
      acceptBtn.disabled = true;
      rejectBtn.disabled = true;
      statusEl.className = 'respond-status ' + status;
      statusEl.textContent = (status === 'accepted' ? '✓ You accepted this proposal' : '✕ You rejected this proposal') +
        (at ? ' on ' + formatDate(at) : '');
    }

    @if($clientResponse)
      setResponded(@json($clientResponse['status']), @json($clientResponse['respondedAt']));
    @endif

    function respond(action) {
      acceptBtn.disabled = true;
      rejectBtn.disabled = true;
      errorEl.style.display = 'none';
      fetch('/p/{{ $token }}/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ action: action }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error('request failed');
          return res.json();
        })
        .then(function (data) {
          setResponded(data.status, data.respondedAt);
        })
        .catch(function () {
          acceptBtn.disabled = false;
          rejectBtn.disabled = false;
          errorEl.style.display = 'block';
        });
    }

    acceptBtn.addEventListener('click', function () { respond('accept'); });
    rejectBtn.addEventListener('click', function () { respond('reject'); });
  })();
</script>
</body>
</html>
