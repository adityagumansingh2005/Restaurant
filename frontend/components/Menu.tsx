/* eslint-disable @next/next/no-img-element */

const menuItems = [
  {
    image: '/Grilled-Chicken-min.jpg',
    name: 'Grilled Chicken',
    description: 'Tender grilled chicken with fresh spices.',
    price: '₹250',
  },
  {
    image: '/CREAMY-ITALIAN-PASTA-SALAD-6.jpg',
    name: 'Veg Pasta',
    description: 'Italian-style pasta with veggies and cheese.',
    price: '₹180',
  },
  {
    image: '/burger.jpg',
    name: 'Special Burger',
    description: 'Juicy burger with special sauce.',
    price: '₹150',
  },
  {
    image: '/Paneer-Tikka-1.jpg',
    name: 'Paneer Tikka',
    description: 'Perfectly roasted paneer with spices.',
    price: '₹200',
  },
];

export default function Menu() {
  return (
    <section id="menu" className="menu section">
      <h2 className="section-title">Our Menu</h2>

      <div className="menu-grid">
        {menuItems.map((item) => (
          <div key={item.name} className="menu-item">
            <img src={item.image} alt={item.name} />
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <span>{item.price}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
