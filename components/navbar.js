import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

export function AppNavbar() {
  return (
    <Navbar expand="lg" variant="light" bg="primary">
      <Container>
        <Navbar.Brand href="/">Shaumik-Ashraf.GitHub.io</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/">Home</Nav.Link>
            <Nav.Link href="#link" disabled={true}>Todo</Nav.Link>
            <NavDropdown title="Dropdown" id="basic-nav-dropdown">
              <NavDropdown.Item href="#action/3.1">Todo</NavDropdown.Item>
              <NavDropdown.Item href="#action/3.2">
                Todo
              </NavDropdown.Item>
              <NavDropdown.Item href="#action/3.3">Todo</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item href="#action/3.4">
                Separated Todo
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export { AppNavbar as Navbar };
export { AppNavbar as default };
