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
  :root { --accent: {{ $company['proposalHeaderColor'] ?? '#0f6e56' }}; }
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
  .header .subtitle { margin-top: 4px; font-size: 13px; color: rgba(255,255,255,0.75); }
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
  .valid-till { font-size: 12px; color: #9ca3af; margin-top: 4px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="company">{{ $company['name'] ?? 'PropDeck' }}</div>
    <div class="subtitle">Proposal {{ $proposal->id }} · {{ optional($proposal->date)->format('d M Y') }}</div>
  </div>

  <div class="card hero">
    <div>
      <div class="label">Prepared For</div>
      <strong>{{ $client->agency ?? '—' }}</strong>
      @if($client?->contact)
        <div class="valid-till">{{ $client->contact }}{{ $client->email ? ' · ' . $client->email : '' }}</div>
      @endif
    </div>
    <div>
      <div class="label">Total Amount</div>
      <div class="amount">&#8377;{{ number_format($proposal->amount, 0) }}</div>
      <div class="valid-till">Valid till {{ $validTill->format('d M Y') }}</div>
    </div>
  </div>

  <div class="card">
    <div class="block-title">Products &amp; Plans</div>
    @if(count($lineItems) > 0)
      <table>
        <thead>
          <tr>
            <th>Product / Plan</th>
            <th class="num">MRP</th>
            <th class="num">Discount</th>
            <th class="num">Final</th>
          </tr>
        </thead>
        <tbody>
          @foreach($lineItems as $item)
            <tr>
              <td>
                <strong>{{ $item['productName'] }}</strong>
                @if($item['planName'])<div style="color:#6b7280;font-size:12px;">{{ $item['planName'] }}</div>@endif
              </td>
              <td class="num">&#8377;{{ number_format($item['mrp'], 0) }}</td>
              <td class="num" style="color:#ef4444;">-&#8377;{{ number_format($item['repDiscount'], 0) }}</td>
              <td class="num"><strong>&#8377;{{ number_format($item['final'], 0) }}</strong></td>
            </tr>
          @endforeach
        </tbody>
      </table>
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
        <div class="totals-row"><span>GST</span><span>&#8377;{{ number_format($proposal->gst, 0) }}</span></div>
      @endif
      <div class="totals-row total"><span>Total</span><span>&#8377;{{ number_format($proposal->amount, 0) }}</span></div>
    </div>
  </div>

  @if($proposal->extras_text)
    <div class="card">
      <div class="block-title">{{ $proposal->extras_heading ?: 'Additional Notes' }}</div>
      <p style="font-size: 13px; color: #374151; white-space: pre-line;">{{ $proposal->extras_text }}</p>
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

  @if($proposal->payment_link)
    <div class="card" style="text-align:center;">
      <div class="block-title">Payment</div>
      <a class="pay-btn" href="{{ $proposal->payment_link }}" target="_blank" rel="noopener">Pay Now</a>
    </div>
  @endif

  <div class="footer">
    This proposal was shared via PropDeck on behalf of {{ $company['name'] ?? 'the sender' }}.
  </div>
</div>
<script>
  fetch('/p/{{ $token }}/viewed', { method: 'POST', keepalive: true }).catch(function () {});
</script>
</body>
</html>
