import { ReactNode } from 'react';

export type SummaryCardVariant = 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'info';

export interface SummaryCardItem {
    label: string;
    value: string | number;
    icon?: ReactNode;
    variant?: SummaryCardVariant;
    change?: { value: string; direction: 'up' | 'down' };
}

interface ModuleSummaryCardsProps {
    cards: SummaryCardItem[];
}

const ModuleSummaryCards = ({ cards }: ModuleSummaryCardsProps) => (
    <div className="mod-summary-grid mod-animate-in" style={{ animationDelay: '120ms' }}>
        {cards.map((card) => (
            <div key={card.label} className="mod-summary-card">
                {card.icon && (
                    <div className={`mod-summary-card__icon mod-summary-card__icon--${card.variant || 'primary'}`}>
                        {card.icon}
                    </div>
                )}
                <div className="mod-summary-card__body">
                    <div className="mod-summary-card__label">{card.label}</div>
                    <div className="mod-summary-card__value">{card.value}</div>
                    {card.change && (
                        <div className={`mod-summary-card__change mod-summary-card__change--${card.change.direction}`}>
                            {card.change.direction === 'up' ? '↑' : '↓'} {card.change.value}
                        </div>
                    )}
                </div>
            </div>
        ))}
    </div>
);

export default ModuleSummaryCards;
