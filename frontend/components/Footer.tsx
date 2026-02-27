export default function Footer() {
  return (
    <footer>
      <p>&copy; 2026 Aditya Gumansingh | All Rights Reserved</p>

      <details>
        <summary>API Endpoints</summary>
        <div>
          <p><strong>Authentication:</strong></p>
          <p>POST /auth/signup</p>
          <p>POST /auth/login</p>
          <p><strong>Orders:</strong></p>
          <p>POST /orders | GET /orders | GET /orders/&#123;id&#125; | PUT /orders/&#123;id&#125; | DELETE /orders/&#123;id&#125;</p>
          <p><strong>Reservations:</strong></p>
          <p>POST /reservations | GET /reservations | GET /reservations/&#123;id&#125; | PUT /reservations/&#123;id&#125; | DELETE /reservations/&#123;id&#125;</p>
          <p><strong>Other:</strong></p>
          <p>GET /menu | GET /health</p>
        </div>
      </details>
    </footer>
  );
}
