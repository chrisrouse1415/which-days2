import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='3' y='5' width='26' height='24' rx='5' fill='%231B2733'/><rect x='9' y='2' width='3' height='6' rx='1.5' fill='%231B2733'/><rect x='20' y='2' width='3' height='6' rx='1.5' fill='%231B2733'/><path d='M10 18.5l4 4 8-8.5' stroke='%232A7F71' stroke-width='3' stroke-linecap='round' stroke-linejoin='round' fill='none'/></svg>"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
