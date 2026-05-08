import React, { useEffect, useState } from 'react';
import { cn, formatRelativeTime } from '../lib/utils';
import { ChevronRight, ChevronDown, ArrowUpCircle, X } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { useAuth } from '../contexts/AuthContext';
import CommentsSection from '../components/CommentsSection';

export default function Track() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('All');
  const [issues, setIssues] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const filters = ['All', 'Active', 'Resolved', 'In Review'];

  useEffect(() => {
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIssues(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'complaints');
    });

    return () => unsubscribe();
  }, []);

  const filteredIssues = issues.filter(issue => {
    if (filter === 'All') return true;
    if (filter === 'Active') return issue.status === 'In Progress' || issue.status === 'Scheduled';
    if (filter === 'Resolved') return issue.status === 'Resolved';
    if (filter === 'In Review') return issue.status === 'Pending Review';
    return true;
  });

  const handleUpvote = async (issueId: string) => {
    if (!user) return;
    try {
      const voteRef = doc(db, 'complaints', issueId, 'votes', user.uid);
      const voteSnap = await getDoc(voteRef);
      
      if (voteSnap.exists()) {
        alert("You have already upvoted this report.");
        return;
      }

      const batch = writeBatch(db);
      
      batch.set(voteRef, {
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      const issueRef = doc(db, 'complaints', issueId);
      batch.update(issueRef, {
        upvotesCount: increment(1),
        updatedAt: serverTimestamp()
      });

      const issue = issues.find(i => i.id === issueId);
      if (issue && issue.userId && issue.userId !== user.uid) {
        const userRef = doc(db, 'users', issue.userId);
        batch.update(userRef, {
          trustScore: increment(1)
        });
      }

      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'complaints');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'text-green-600 bg-green-50 ring-green-200';
      case 'In Progress': return 'text-blue-600 bg-blue-50 ring-blue-200';
      case 'Pending Review': return 'text-orange-600 bg-orange-50 ring-orange-200';
      case 'Scheduled': return 'text-purple-600 bg-purple-50 ring-purple-200';
      default: return 'text-gray-600 bg-gray-50 ring-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-700 bg-red-100 ring-red-200';
      case 'HIGH': return 'text-orange-700 bg-orange-100 ring-orange-200';
      case 'MEDIUM': return 'text-blue-700 bg-blue-100 ring-blue-200';
      case 'LOW': return 'text-green-700 bg-green-100 ring-green-200';
      default: return 'text-gray-700 bg-gray-100 ring-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center mt-2">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Track Reports</h2>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">{filteredIssues.length} Matches</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sticky top-0 bg-slate-100 py-2 z-10">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ring-1 focus:outline-none",
              filter === f 
                ? "bg-blue-600 text-white ring-blue-600 shadow-md shadow-blue-500/20" 
                : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Issue List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 && <p className="text-center text-sm text-gray-500 py-10">No reports found.</p>}
        {filteredIssues.map(issue => (
          <div key={issue.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex gap-3">
              {/* Image Thumbnail */}
              <div className="w-16 h-16 rounded-lg bg-gray-100 shrink-0 overflow-hidden relative" onClick={() => issue.imageUrl && setSelectedImage(issue.imageUrl)}>
                {issue.imageUrl ? (
                  <img src={issue.imageUrl} alt={issue.title} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium text-xs bg-gray-200">No Img</div>
                )}
                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg pointer-events-none"></div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{issue.title}</h3>
                  <span className={cn("shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ring-1", getPriorityColor(issue.priority))}>
                    {issue.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{issue.locationName || 'Location hidden'}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-medium">
                   <span>Submitted {formatRelativeTime(issue.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(issue.status).split(' ')[0].replace('text-', 'bg-'))}></span>
                <span className="text-xs font-medium text-gray-700">{issue.status}</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleUpvote(issue.id)}
                  disabled={!user}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
                  title={user ? "Upvote" : "Login to upvote"}
                >
                  <ArrowUpCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-xs font-bold text-gray-600">{issue.upvotesCount || 0}</span>
                </button>
                <button 
                  onClick={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                  className="text-xs text-blue-600 font-medium flex items-center hover:text-blue-700"
                >
                  Details {expandedIssueId === issue.id ? <ChevronDown className="w-3 h-3 ml-0.5" /> : <ChevronRight className="w-3 h-3 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Expandable Details Section */}
            {expandedIssueId === issue.id && (
              <div className="border-t border-gray-100 pt-3 mt-3 animate-in slide-in-from-top-2 duration-200">
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {issue.description || 'No description provided for this report.'}
                  </p>
                </div>
                
                <CommentsSection issueId={issue.id} />
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full screen preview" className="max-w-full max-h-full rounded-lg object-contain" />
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
