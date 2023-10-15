import type { AppProps } from "next/app"
import "bootstrap/dist/css/bootstrap.css"
import "bootstrap-icons/font/bootstrap-icons.css"
import "@aws-amplify/ui-react/styles.css"
import "../components/TextSection.css"
import "./credits/page.css"
import "./style.css"
import Head from "next/head"
import Link from "next/link"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no"
        />

        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div className="min-vh-100 d-flex flex-column">
        <Component {...pageProps} />

        <footer className="footer mt-auto py-3 bg-light">
          <div className="container">
            <div className="row">
              <div className="col text-center text-md-end mt-0">
                <ol className="footer-link-list list-inline mb-0">
                  <li className="list-inline-item d-inline-block me-3">
                    <Link href="/imprint">Imprint</Link>
                  </li>
                  <li className="list-inline-item d-inline-block me-3">
                    <Link href="/privacy-policy">Privacy Policy</Link>
                  </li>
                  <li className="list-inline-item d-inline-block">
                    <Link href="/credits">Credits</Link>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
