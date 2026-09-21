interface BuyButtonProps {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}

export function BuyButton({ disabled, pending, onClick }: BuyButtonProps) {
  return (
    <button
      className="buy-button"
      type="button"
      disabled={disabled}
      onClick={(event) => {
        // Disabled is only committed on the next paint; pin it on the DOM now
        // so a second native click cannot queue another purchase.
        event.currentTarget.disabled = true;
        onClick();
      }}
    >
      {pending ? 'Buying…' : 'Buy'}
    </button>
  );
}
