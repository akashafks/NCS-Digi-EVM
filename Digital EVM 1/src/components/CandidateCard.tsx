import React, { useState, useEffect } from 'react';
import { Edit, Trash2, User, Star } from 'lucide-react';
import ProfileImageEditor from './ProfileImageEditor';
import { Candidate } from '../types';

interface CandidateCardProps {
  candidate: Candidate;
  onEdit?: () => void;
  onDelete?: () => void;
  selected?: boolean;
  onClick?: () => void;
  onUpdateCandidate?: (candidate: Candidate) => void;
}

const houseColors = {
  'Udaygiri': 'from-red-400 to-red-600',
  'Nilgiri': 'from-blue-400 to-blue-600',
  'Dunagiri': 'from-green-400 to-green-600',
  'Himgiri': 'from-yellow-400 to-yellow-600',
};

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  onEdit,
  onDelete,
  selected = false,
  onClick,
  onUpdateCandidate
}) => {
  const houseGradient = houseColors[candidate.house as keyof typeof houseColors] || 'from-gray-400 to-gray-600';

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editInfo] = useState(false);

  useEffect(() => {
    if (candidate.image && candidate.image.startsWith('data:image/')) {
      setPhotoUrl(candidate.image);
      return;
    }
    let isMounted = true;
    const tryLoadImage = async () => {
      const exts = ['jpg', 'png'];
      for (const ext of exts) {
        const url = `/images/${candidate.name}.${ext}`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok && isMounted) {
            setPhotoUrl(url);
            return;
          }
        } catch {}
      }
      if (isMounted) setPhotoUrl(null);
    };
    tryLoadImage();
    return () => { isMounted = false; };
  }, [candidate.name, candidate.image]);

  const handleImageApply = (croppedImage: string) => {
    setShowImageEditor(false);
    if (onUpdateCandidate) {
      onUpdateCandidate({ ...candidate, image: croppedImage });
    }
  };

  return (
    <>
      <div
        className={`card-duolingo overflow-hidden transition-all duration-300 ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        } ${selected ? 'card-selected wiggle' : ''}`}
        onClick={onClick}
        style={{
          maxWidth: '220px',
          fontSize: '0.85rem',
          padding: '0.75rem',
          border: selected ? '3px solid #22c55e' : '2px solid #d1d5db',
          borderRadius: '18px',
          boxShadow: '0 4px 16px 0 rgba(0,0,0,0.06)',
          background: '#fff',
          margin: '0 8px',
          position: 'relative',
        }}
      >
        {/* House color header */}
        <div className={`h-2 bg-gradient-to-r ${houseGradient}`}></div>

        {/* Image Section */}
        <div
          className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden"
          style={{ minHeight: '120px' }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={candidate.name}
              className="w-full h-full object-cover"
              style={{ display: 'block', objectFit: 'cover' }}
              onClick={e => {
                if (editInfo) {
                  e.stopPropagation();
                  setShowImageEditor(true);
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <User size={80} className="text-gray-400" />
            </div>
          )}
          {/* ProfileImageEditor Modal (edit mode only) */}
          {editInfo && showImageEditor && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="card-duolingo p-8 max-w-md w-full fade-in">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Profile Photo</h3>
                <ProfileImageEditor
                  initialImage={photoUrl || ''}
                  onApply={handleImageApply}
                />
                <button
                  className="mt-4 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl font-bold"
                  onClick={() => setShowImageEditor(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-yellow-500" />
            <h3 className="font-bold text-xl text-gray-800">{candidate.name}</h3>
          </div>
          <div className="space-y-2 text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">📚</span>
              </div>
              <span className="font-semibold">Class: {candidate.class} - {candidate.section}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600">🏠</span>
              </div>
              <span className="font-semibold">House: {candidate.house}</span>
            </div>
          </div>
          {(onEdit || onDelete) && !editInfo && (
            <div className="flex gap-3 mt-2 w-full pb-2 px-2" style={{justifyContent: 'space-between'}}>
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) onEdit();
                  }}
                  className="flex-1 btn-secondary-duolingo flex items-center justify-center gap-2 text-sm py-3"
                  style={{minWidth: 0}}
                >
                  <Edit size={16} />
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex-1 btn-danger-duolingo flex items-center justify-center gap-2 text-sm py-3"
                  style={{minWidth: 0}}
                  aria-label="Delete Candidate"
                >
                  <Trash2 size={20} color="#fff" />
                </button>
              )}
            </div>
          )}
          {selected && (
            <div className="mt-4 bg-gradient-to-r from-green-400 to-green-500 text-white py-3 px-6 rounded-2xl text-center font-bold shadow-lg">
              ✨ Selected! ✨
            </div>
          )}
        </div>
      </div>
    </>
  );
};