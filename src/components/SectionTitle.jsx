export default function SectionTitle({ business, id, children }) {
  return (
    <div className="section-heading">
      <img className="section-logo" src={business.logo} alt={`Logo da ${business.name}`} />
      <h2 id={id}>{children}</h2>
    </div>
  );
}
