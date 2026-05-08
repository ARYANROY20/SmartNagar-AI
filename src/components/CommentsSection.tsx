import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Send } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export default function CommentsSection({ issueId }: { issueId: string }) {
  const { user, userData } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'complaints', issueId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `complaints/${issueId}/comments`);
    });

    return () => unsubscribe();
  }, [issueId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'complaints', issueId, 'comments'), {
        userId: user.uid,
        userName: userData?.name || user.displayName || 'Anonymous Citizen',
        text: newComment.trim(),
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `complaints/${issueId}/comments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">
      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Comments</h4>
      
      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
        {comments.length === 0 && <p className="text-xs text-gray-500 italic">No comments yet. Be the first!</p>}
        {comments.map(comment => (
          <div key={comment.id} className="bg-gray-50 p-2.5 rounded-lg">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold text-gray-700">{comment.userName}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed break-words">{comment.text}</p>
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="relative mt-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="absolute right-1.5 top-1.5 p-1 rounded-md text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <p className="text-[10px] text-gray-500 mt-2 text-center bg-gray-50 py-2 rounded-lg">Login to join the discussion.</p>
      )}
    </div>
  );
}
