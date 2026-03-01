'use client';

import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';

const menuItems = [
  {
    id: 'grilled-chicken',
    image: '/Grilled-Chicken-min.jpg',
    name: 'Grilled Chicken',
    description: 'Tender grilled chicken with fresh spices.',
    price: 250,
  },
  {
    id: 'veg-pasta',
    image: '/CREAMY-ITALIAN-PASTA-SALAD-6.jpg',
    name: 'Veg Pasta',
    description: 'Italian-style pasta with veggies and cheese.',
    price: 180,
  },
  {
    id: 'special-burger',
    image: '/burger.jpg',
    name: 'Special Burger',
    description: 'Juicy burger with special sauce.',
    price: 150,
  },
  {
    id: 'paneer-tikka',
    image: '/Paneer-Tikka-1.jpg',
    name: 'Paneer Tikka',
    description: 'Perfectly roasted paneer with spices.',
    price: 200,
  },
];

export default function Menu() {
  const { addItem, items } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAdd = (item: (typeof menuItems)[number]) => {
    addItem({ id: item.id, name: item.name, price: item.price, image: item.image });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 800);
  };

  return (
    <section id="menu" className="menu section">
      <h2 className="section-title">Our Menu</h2>
      <p className="section-subtitle">Handcrafted dishes made with love</p>

      <div className="menu-grid">
        {menuItems.map((item) => {
          const inCart = items.find(i => i.id === item.id);
          const justAdded = addedId === item.id;

          return (
            <div key={item.id} className="menu-item">
              <div className="menu-item-img-wrap">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={400}
                  height={300}
                  style={{ width: '100%', height: 'auto', borderRadius: '10px 10px 0 0' }}
                  loading="lazy"
                />
                {inCart && (
                  <span className="menu-item-badge">{inCart.quantity} in cart</span>
                )}
              </div>

              <div className="menu-item-info">
                <h3>{item.name}</h3>
                <p>{item.description}</p>

                <div className="menu-item-bottom">
                  <span className="menu-item-price">₹{item.price}</span>
                  <button
                    className={`menu-add-btn${justAdded ? ' added' : ''}`}
                    onClick={() => handleAdd(item)}
                  >
                    {justAdded ? '✓ Added' : '+ Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
