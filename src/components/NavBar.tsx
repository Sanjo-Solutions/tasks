import Link from "next/link"

export function NavBar() {
  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container">
        <Link className="navbar-brand" href="/">
          Tasks
        </Link>
      </div>
    </nav>
  )
}
