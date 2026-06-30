import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goalData: { title: string; targetValue: number; unit: string; deadline: string }) => void;
}

const CreateGoalModal: React.FC<CreateGoalModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState(1);
  const [unit, setUnit] = useState('commits');
  const [deadline, setDeadline] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, targetValue, unit, deadline });
    setTitle('');
    setTargetValue(1);
    setUnit('commits');
    setDeadline('');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="card glass-panel modal-content animate-fade-in" style={{ maxWidth: '450px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'var(--text-muted)' }}>
          <X size={20} />
        </button>
        
        <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Set a New Developer Goal</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Goal Title</label>
            <input type="text" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Solve Array Problems" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Target Number</label>
              <input type="number" className="input-field" min={1} value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="input-field" value={unit} onChange={(e) => setUnit(e.target.value)} style={{ appearance: 'none', backgroundColor: 'var(--bg-color)' }}>
                <option value="commits">commits</option>
                <option value="problems">problems solved</option>
                <option value="hours">hours</option>
                <option value="projects">projects</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Target Date / Deadline</label>
            <input type="date" className="input-field" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Goal</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGoalModal;
