import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'POST') {
        return handlePost(request, env);
    }

    // Serve the static index.html for GET requests
    const SITE_KEY = env.SITE_KEY; // Replace with your actual site key

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Turnstile Demo</title>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <script>
            function onSuccess() {
                document.getElementById('turnstile-form').submit();
            }
        </script>
    </head>
    <body>
        <form id="turnstile-form" action="/" method="POST">
            <div class="cf-turnstile" data-sitekey="${SITE_KEY}" data-callback="onSuccess" data-theme="light"></div>
        </form>
    </body>
    </html>
    `;

    return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html' },
    });
}

async function handlePost(request, env) {
    const body = await request.formData();
    const token = body.get('cf-turnstile-response');
    const ip = request.headers.get('CF-Connecting-IP');

    let formData = new FormData();
    formData.append('secret', env.SECRET_KEY); // Ensure SECRET_KEY is set in your environment variables
    formData.append('response', token);
    formData.append('remoteip', ip);

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const result = await fetch(url, {
        body: formData,
        method: 'POST',
    });

    const outcome = await result.json();

    if (!outcome.success) {
        return new Response('The provided Turnstile token was not valid!', { status: 401 });
    }

    // Successfully validated the Turnstile token, serve the index.html content
    return getAssetFromKV(context, new Request(new URL('/index.html', request.url), request));
}
