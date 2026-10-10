export default function BrandIcon({
  name,
  icon,
  size = "w-6 h-6",
}: {
  name: string;
  icon: string;
  size?: string;
}) {
  return (
    <img src={icon} alt={name} className={`${size} rounded-full object-cover shrink-0`} />
  );
}