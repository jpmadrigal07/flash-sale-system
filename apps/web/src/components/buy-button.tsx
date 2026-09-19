interface BuyButtonProps {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}

export function BuyButton({ disabled, pending, onClick }: BuyButtonProps) {
  return (
    <button className="buy-button" type="button" disabled={disabled} onClick={onClick}>
      {pending ? 'Buying…' : 'Buy'}
    </button>
  );
}
