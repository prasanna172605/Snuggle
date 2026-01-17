import React from 'react';
import { Users2 } from 'lucide-react';
import { ViewState } from '../types';

interface CirclesHeaderIconProps {
    onNavigate: (view: ViewState) => void;
    className?: string;
}

const CirclesHeaderIcon: React.FC<CirclesHeaderIconProps> = ({ onNavigate, className = '' }) => {
    return (
        <button
            onClick={() => onNavigate(ViewState.CIRCLES)}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
            aria-label="My Circles"
        >
            <Users2 className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
    );
};

export default CirclesHeaderIcon;
