import React, { useState, useRef } from 'react';
import { Upload, User, Star, Camera } from 'lucide-react';
import { Candidate } from '../types';
import ProfileImageEditor from './ProfileImageEditor';

interface CandidateFormProps {
  roleId: string;
  candidate?: Candidate;
  houses: string[];
  onSave: (candidate: Candidate) => void;
  onCancel: () => void;
}

const houseColors = {
  'Udaygiri': 'from-red-400 to-red-600',
  'Nilgiri': 'from-blue-400 to-blue-600',
  'Dunagiri': 'from-green-400 to-green-600',
  'Himgiri': 'from-yellow-400 to-yellow-600',
};

// Utility to compress image
async function compressImage(file: File, maxSize = 400, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height *= maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width *= maxSize / height));
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const CandidateForm: React.FC<CandidateFormProps> = ({
  roleId,
  candidate,
  houses,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: candidate?.name || '',
    class: candidate?.class || '',
    section: candidate?.section || '',
    house: candidate?.house || houses[0],
    image: candidate?.image || '',
    photoRect: candidate?.photoRect || { x: 0, y: 0, width: 1, height: 1 }
  });
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageAspect, setImageAspect] = useState(1); // width / height
  const dragState = useRef<{ type: string, startX: number, startY: number, startRect: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // On image load, get aspect ratio and set initial photoRect if not set
  React.useEffect(() => {
    if (!formData.image) return;
    const img = new window.Image();
    img.onload = () => {
      const aspect = img.naturalWidth / img.naturalHeight || 1;
      setImageAspect(aspect);
      // If photoRect is not set or is default, set initial crop
      if (!candidate?.photoRect || (formData.photoRect.x === 0 && formData.photoRect.y === 0 && formData.photoRect.width === 1 && formData.photoRect.height === 1)) {
        let width = 1, height = 1, x = 0, y = 0;
        if (aspect > 1) {
          height = 1 / aspect;
          y = (1 - height) / 2;
        } else if (aspect < 1) {
          width = aspect;
          x = (1 - width) / 2;
        }
        setFormData(prev => ({ ...prev, photoRect: { x, y, width, height } }));
      }
    };
    img.src = formData.image;
  }, [formData.image]);

  // Helper to clamp values
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  // Mouse/touch event handlers for drag/resize
  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState.current) return;
    const { type, startX, startY, startRect } = dragState.current;
    const dx = (e.clientX - startX) / 128;
    const dy = (e.clientY - startY) / 128;
    let { x, y, width, height } = startRect;
    if (type === 'move') {
      x = clamp(x + dx, -width + 0.01, 1 - 0.01);
      y = clamp(y + dy, -height + 0.01, 1 - 0.01);
    } else {
      let delta = 0;
      if (type === 'top-left') {
        delta = Math.min(dx, dy);
        let newWidth = clamp(width - delta, 0.1, 2);
        let newHeight = newWidth / imageAspect;
        let newX = clamp(x + (width - newWidth), -newWidth + 0.01, 1 - 0.01);
        let newY = clamp(y + (height - newHeight), -newHeight + 0.01, 1 - 0.01);
        width = newWidth;
        height = newHeight;
        x = newX;
        y = newY;
      } else if (type === 'top-right') {
        delta = Math.min(-dx, dy);
        let newWidth = clamp(width + dx, 0.1, 2);
        let newHeight = newWidth / imageAspect;
        let newY = clamp(y + (height - newHeight), -newHeight + 0.01, 1 - 0.01);
        width = newWidth;
        height = newHeight;
        y = newY;
      } else if (type === 'bottom-right') {
        delta = Math.max(dx, dy);
        let newWidth = clamp(width + delta, 0.1, 2);
        let newHeight = newWidth / imageAspect;
        width = newWidth;
        height = newHeight;
      } else if (type === 'bottom-left') {
        delta = Math.max(-dx, dy);
        let newWidth = clamp(width - (-dx), 0.1, 2);
        let newHeight = newWidth / imageAspect;
        let newX = clamp(x + (width - newWidth), -newWidth + 0.01, 1 - 0.01);
        width = newWidth;
        height = newHeight;
        x = newX;
      }
      x = clamp(x, -width + 0.01, 1 - 0.01);
      y = clamp(y, -height + 0.01, 1 - 0.01);
    }
    setFormData(prev => ({ ...prev, photoRect: { x, y, width, height } }));
  };
  const handleMouseUp = () => {
    dragState.current = null;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const candidateData: Candidate = {
      id: candidate?.id || Date.now().toString(),
      ...formData,
      roleId
    };
    await onSave(candidateData);
    setIsSubmitting(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        // Get aspect ratio and set initial photoRect
        const img = new window.Image();
        img.onload = () => {
          const aspect = img.naturalWidth / img.naturalHeight || 1;
          setImageAspect(aspect);
          // Calculate initial photoRect to fit image fully in crop window
          let width = 1, height = 1, x = 0, y = 0;
          if (aspect > 1) {
            // Wider than tall (letterbox)
            height = 1 / aspect;
            y = (1 - height) / 2;
          } else if (aspect < 1) {
            // Taller than wide (pillarbox)
            width = aspect;
            x = (1 - width) / 2;
          }
          setFormData(prev => ({ ...prev, image: compressed, photoRect: { x, y, width, height } }));
        };
        img.src = compressed;
      } catch (err) {
        alert('Image upload failed. Please try a different image.');
      }
    }
  };

  return (
    <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center p-4 z-50">
      <div className="card-duolingo p-8 max-w-2xl w-full fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star size={32} className="text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{candidate ? 'Edit Candidate' : 'Add New Candidate'}</h3>
          <p className="text-gray-600 text-lg">Fill in the candidate details</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-8 mb-6" style={{maxHeight: '40vh', overflowY: 'auto'}}>
            <div>
              <label className="block text-lg font-bold text-gray-700 mb-4">
                📸 Candidate Photo
              </label>
              <div className="flex items-center space-x-6">
                <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center overflow-hidden border-4 border-gray-200 relative">
                  {formData.image ? (
                    <div
                      className="w-full h-full relative cursor-pointer"
                      style={{ userSelect: 'none' }}
                      onClick={() => setShowImageEditor(true)}
                    >
                      <img
                        src={formData.image}
                        alt="Candidate"
                        className="absolute"
                        style={{
                          left: 0,
                          top: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          pointerEvents: 'none',
                        }}
                      />
                    </div>
                  ) : (
                    <User size={48} className="text-gray-400" />
                  )}
                  {showImageEditor && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <div className="card-duolingo p-8 max-w-md w-full fade-in">
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Profile Photo</h3>
                        <ProfileImageEditor
                          initialImage={formData.image}
                          onApply={(croppedImage) => {
                            setFormData(prev => ({ ...prev, image: croppedImage }));
                            setShowImageEditor(false);
                          }}
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
                <div>
                  <label className="btn-secondary-duolingo cursor-pointer flex items-center gap-3 text-lg">
                    <Camera size={20} />
                    <Upload size={20} />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    className="mt-2 w-full btn-danger-duolingo text-sm"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  >
                    Remove Photo
                  </button>
                  <p className="text-gray-500 mt-2 text-sm">Recommended: Square image, 400x400px</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-lg font-bold text-gray-700 mb-4">
                👤 Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                placeholder="Enter candidate's full name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-lg font-bold text-gray-700 mb-4">
                  📚 Class
                </label>
                <input
                  type="text"
                  value={formData.class}
                  onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                  className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                  placeholder="e.g., 10th"
                  required
                />
              </div>
              <div>
                <label className="block text-lg font-bold text-gray-700 mb-4">
                  📝 Section
                </label>
                <input
                  type="text"
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                  className="w-full px-6 py-4 border-3 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-400 transition-all duration-300 text-lg font-medium"
                  placeholder="e.g., A"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-lg font-bold text-gray-700 mb-4">
                🏠 House
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {houses.map(house => {
                  const houseGradient = houseColors[house as keyof typeof houseColors] || 'from-gray-400 to-gray-600';
                  const isSelected = formData.house === house;
                  
                  return (
                    <button
                      key={house}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, house }))}
                      className={`p-4 rounded-2xl border-3 transition-all duration-300 ${
                        isSelected 
                          ? 'border-gray-800 shadow-lg scale-105' 
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className={`w-full h-16 bg-gradient-to-br ${houseGradient} rounded-xl mb-3`}></div>
                      <div className="text-lg font-bold text-gray-800">{house}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          <div className="space-y-3">
            <button type="submit" className="w-full btn-primary-duolingo" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : (candidate ? '✏️ Update Candidate' : '➕ Add Candidate')}
            </button>
            <button type="button" onClick={onCancel} className="w-full px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-all duration-300 font-bold text-lg">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};