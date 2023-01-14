export const SUCCESS_JSON_INFO = {
  status: 200,
  headers: {
    "Content-Type": "application/json",
  },
};

export const ERROR_JSON_INFO = {
  status: 400,
  headers: {
    "Content-Type": "application/json",
  },
};

const STATIC_HTML_TEMPLATE = String.raw`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open Collective Discord Integration</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      background: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 16px;
      margin: 0;
    }
    main {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 3px;
      box-shadow: 0 1px 1px rgba(0,0,0,.04);
      margin: 50px auto;
      max-width: 600px;
      padding: 30px;
      text-align: center;
    }
    p {
      margin: 0 0 4px;
    }
    button {
      background: #4372d0;
      border: 1px solid #3366cc;
      border-radius: 3px;
      box-shadow: 0 1px 1px rgba(0,0,0,.04);
      color: #fff;
      cursor: pointer;
      font-size: 16px;
      padding: 10px 20px;
    }
    button:hover {
      background: #527ed4;
    }
    .title {
      margin-bottom: 0px;
      font-size: 20px;
    }
    .subtitle {
      font-size: 14px;
      color: #666;
    }
    .notification {
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <main>
    {{svg}}
    <div class="notification">
      <p class="title">{{title}}</p>
      <span class="subtitle">You can now safely close this tab.</span>
    </div>
  </main>
  <script>
    window.history.replaceState(null, null, "{{url}}");
  </script>
</body>
</html>
`;

const SUCCESS_SVG = `<svg fill="#66cc33" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 26 26" width="96px" height="96px"><path d="M 13 1 C 6.382813 1 1 6.382813 1 13 C 1 19.617188 6.382813 25 13 25 C 19.617188 25 25 19.617188 25 13 C 25 6.382813 19.617188 1 13 1 Z M 13 3 C 18.535156 3 23 7.464844 23 13 C 23 18.535156 18.535156 23 13 23 C 7.464844 23 3 18.535156 3 13 C 3 7.464844 7.464844 3 13 3 Z M 17.1875 7.0625 C 17.039063 7.085938 16.914063 7.164063 16.8125 7.3125 L 11.90625 14.59375 L 9.59375 12.3125 C 9.394531 12.011719 9.011719 11.988281 8.8125 12.1875 L 7.90625 13.09375 C 7.707031 13.394531 7.707031 13.800781 7.90625 14 L 11.40625 17.5 C 11.605469 17.601563 11.886719 17.8125 12.1875 17.8125 C 12.386719 17.8125 12.707031 17.707031 12.90625 17.40625 L 18.90625 8.59375 C 19.105469 8.292969 18.992188 8.011719 18.59375 7.8125 L 17.59375 7.09375 C 17.492188 7.042969 17.335938 7.039063 17.1875 7.0625 Z"/></svg>`;
const ERROR_SVG = `<svg fill="#cc3366" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="96px" height="96px"><path d="M 16 3 C 8.832031 3 3 8.832031 3 16 C 3 23.167969 8.832031 29 16 29 C 23.167969 29 29 23.167969 29 16 C 29 8.832031 23.167969 3 16 3 Z M 16 5 C 22.085938 5 27 9.914063 27 16 C 27 22.085938 22.085938 27 16 27 C 9.914063 27 5 22.085938 5 16 C 5 9.914063 9.914063 5 16 5 Z M 12.21875 10.78125 L 10.78125 12.21875 L 14.5625 16 L 10.78125 19.78125 L 12.21875 21.21875 L 16 17.4375 L 19.78125 21.21875 L 21.21875 19.78125 L 17.4375 16 L 21.21875 12.21875 L 19.78125 10.78125 L 16 14.5625 Z"/></svg>`;

export function htmlResponse(message: string, success: boolean): Response {
  const svg = success ? SUCCESS_SVG : ERROR_SVG;
  const url = success ? "/success" : "/error";
  const html = STATIC_HTML_TEMPLATE.replace("{{title}}", message)
    .replace("{{svg}}", svg)
    .replace("{{url}}", url);

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
    },
  });
}
