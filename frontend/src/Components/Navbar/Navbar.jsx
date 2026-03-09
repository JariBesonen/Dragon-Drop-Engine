import "./Navbar.css";
function Navbar() {
    return (
        <nav>
            <a href="/"><h1>DDE</h1></a>
            <ul>
                <li><a href="/pricing">pricing</a></li>
                <li><a href="/learn">learn</a></li>
                <li><a href="/create">create</a></li>
                <li><a href="/news">news</a></li>
                <li><a href="/profile">profile</a></li>
            </ul>
        </nav>
    )
}
export default Navbar;