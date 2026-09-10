/** Stripe.js Payment Element hosted inside a WebView for Expo Go. */
export function stripePaymentHtml(input: {
  publishableKey: string
  clientSecret: string
  title: string
}): string {
  const title = JSON.stringify(input.title)
  const pk = JSON.stringify(input.publishableKey)
  const cs = JSON.stringify(input.clientSecret)
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 16px; background: #FDF6ED; color: #2C1810; }
    h1 { font-size: 20px; margin: 0 0 12px; color: #6B1E2A; }
    #payment-element { margin: 16px 0; padding: 12px; background: #fff; border-radius: 12px; border: 1px solid #E8D9C8; }
    button { width: 100%; background: #6B1E2A; color: #fff; border: 0; border-radius: 12px; padding: 14px; font-size: 16px; font-weight: 700; }
    button:disabled { opacity: 0.5; }
    #msg { margin-top: 12px; font-size: 14px; color: #8B6F5C; min-height: 20px; }
  </style>
</head>
<body>
  <h1 id="title"></h1>
  <div id="payment-element"></div>
  <button id="pay">Pay now</button>
  <div id="msg"></div>
  <script>
    const title = ${title};
    const pk = ${pk};
    const cs = ${cs};
    document.getElementById('title').textContent = title;
    const stripe = Stripe(pk);
    const elements = stripe.elements({ clientSecret: cs });
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');
    const btn = document.getElementById('pay');
    const msg = document.getElementById('msg');
    function post(type, payload) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
    }
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      msg.textContent = 'Processing…';
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        msg.textContent = error.message || 'Payment failed';
        post('error', { message: error.message || 'Payment failed' });
        btn.disabled = false;
        return;
      }
      if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture' || paymentIntent.status === 'processing')) {
        msg.textContent = 'Payment successful';
        post('success', { paymentIntentId: paymentIntent.id, status: paymentIntent.status });
      } else {
        msg.textContent = 'Payment status: ' + (paymentIntent && paymentIntent.status);
        post('error', { message: 'Unexpected status' });
        btn.disabled = false;
      }
    });
  </script>
</body>
</html>`
}
