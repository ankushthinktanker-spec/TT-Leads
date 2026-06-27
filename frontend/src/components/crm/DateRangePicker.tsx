import { cn } from '../../lib/utils';
import ModuleFilterDropdown from '../module-system/ModuleFilterDropdown';

export type DateRangePreset = '7d' | '15d' | '30d' | '3m' | '6m' | 'custom';

export type DateRangeValue = {
    preset: DateRangePreset;
    start?: string;
    end?: string;
};

interface DateRangePickerProps {
    value: DateRangeValue;
    onChange: (value: DateRangeValue) => void;
    className?: string;
}

const presetLabels: Record<DateRangePreset, string> = {
    '7d': 'Last 7 days',
    '15d': 'Last 15 days',
    '30d': 'Last 30 days',
    '3m': 'Last 3 months',
    '6m': 'Last 6 months',
    custom: 'Custom'
};

const DateRangePicker = ({ value, onChange, className }: DateRangePickerProps) => {
    const dateOptions = Object.entries(presetLabels).map(([key, label]) => ({
        value: key,
        label,
    }));

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <ModuleFilterDropdown
                ariaLabel="Select date range preset"
                value={value.preset}
                options={dateOptions}
                onChange={(nextValue) => onChange({ ...value, preset: nextValue as DateRangePreset })}
                triggerClassName="input !h-10 !text-sm !font-medium !normal-case !tracking-normal"
            />
            {value.preset === 'custom' && (
                <>
                    <input
                        type="date"
                        className="input h-10 text-sm"
                        value={value.start || ''}
                        onChange={(e) => onChange({ ...value, start: e.target.value })}
                    />
                    <input
                        type="date"
                        className="input h-10 text-sm"
                        value={value.end || ''}
                        onChange={(e) => onChange({ ...value, end: e.target.value })}
                    />
                </>
            )}
        </div>
    );
};

export default DateRangePicker;
