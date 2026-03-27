interface SwitchProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    label?: string;
}

const Switch = ({ checked, onChange, label }: SwitchProps) => {
    return (
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                className={`relative h-6 w-11 rounded-full transition-colors focus:ring-2 focus:ring-brand-500/20 focus:outline-none ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
                onClick={() => onChange(!checked)}
            >
                <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
            </button>
            {label && <span className="text-sm text-slate-700">{label}</span>}
        </label>
    );
};

export default Switch;

