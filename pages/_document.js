import { Html, Head, Main, NextScript } from 'next/document'
 
export default function Document() {
  return (
    <Html>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body>
        <noscript>
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#073642', color: '#839496',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'monospace', textAlign: 'center', padding: '2rem',
          }}>
            <p style={{ fontSize: '1.5rem', color: '#b58900', marginBottom: '1rem' }}>
              JavaScript is required
            </p>
            <p>
              This site requires JavaScript to work. Please&nbsp;
              <a href="https://www.browserstack.com/guide/how-to-enable-javascript-in-browser">
                enable JavaScript
              </a>
              &nbsp;or try another web browser.
            </p>
          </div>
        </noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
