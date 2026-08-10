import React from 'react';
import ShoutoutCard from './ShoutoutCard';

const ShoutoutFeed = ({ shoutouts, currentUserId, isAdmin, onDelete, colleagues, onUpdate, onReact }) => {
    if (shoutouts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 italic bg-white/[0.02] rounded-[1.8rem] border border-white/5">
                <p>No shout-outs found matching your filters.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-4 pb-12">
            {shoutouts.map(shoutout => (
                <div key={shoutout.id} className="transform transition-all duration-500 hover:-translate-x-1">
                    <ShoutoutCard
                        shoutout={shoutout}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        onDelete={onDelete}
                        colleagues={colleagues}
                        onUpdate={onUpdate}
                        onReact={(newReactions) => onReact && onReact(shoutout.id, newReactions)}
                    />
                </div>
            ))}
        </div>
    );
};

export default ShoutoutFeed;
