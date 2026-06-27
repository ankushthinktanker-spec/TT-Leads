import { ReactNode } from 'react';
import Drawer from '../ui/Drawer';

interface FilterDrawerProps {
    title?: string;
    open: boolean;
    onClose: () => void;
    onReset?: () => void;
    onApply?: () => void;
    children: ReactNode;
}

const FilterDrawer = ({ title = 'Filters', open, onClose, onReset, onApply, children }: FilterDrawerProps) => {
    return (
        <Drawer
            open={open}
            title={title}
            onClose={onClose}
            footer={(
                <div className="flex items-center justify-between">
                    <button type="button" className="btn btn-outline" onClick={onReset}>
                        Reset
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onApply}>
                        Apply
                    </button>
                </div>
            )}
        >
            <div className="space-y-4">
                {children}
            </div>
        </Drawer>
    );
};

export default FilterDrawer;

