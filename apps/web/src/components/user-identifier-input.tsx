interface UserIdentifierInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function UserIdentifierInput({ value, onChange }: UserIdentifierInputProps) {
  return (
    <label className="user-identifier-input">
      User identifier
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="you@example.com"
        autoComplete="username"
        maxLength={128}
      />
    </label>
  );
}
