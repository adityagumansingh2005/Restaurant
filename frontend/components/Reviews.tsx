const reviews = [
  {
    name: 'Aditya Gumansingh',
    text: 'Amazing taste and great service. Highly recommend!',
  },
  {
    name: 'Abhishek Jena',
    text: 'The food is delicious and the ambiance is perfect.',
  },
  {
    name: 'Om Soumya',
    text: "One of the best restaurants I've visited. Loved it!",
  },
];

export default function Reviews() {
  return (
    <section id="reviews" className="reviews section">
      <h2 className="section-title">Customer Reviews</h2>

      <div className="review-container">
        {reviews.map((review) => (
          <div key={review.name} className="review-card">
            <h3>{review.name}</h3>
            <p>{review.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
