import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, ListTodo, Map as MapIcon, BarChart3, Settings, ShieldAlert, ChevronRight, Activity, ArrowUpCircle, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestoreError';
import { cn } from '../lib/utils';
import LiveHeatmap from '../components/LiveHeatmap';
import UserNameLabel from '../components/UserNameLabel';

export default function AdminDashboard() {
  const { role, loading } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'admin') return;

    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setIssues(data);
    });
    return () => unsubscribe();
  }, [role]);

  if (loading) return null;
  
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const totalComplaints = issues.length;
  const resolvedIssues = issues.filter(i => i.status === 'Resolved').length;
  const pendingIssues = issues.filter(i => i.status === 'Pending Review' || i.status === 'In Progress').length;
  
  // High priority count
  const urgentIssues = issues.filter(i => i.priority === 'URGENT' || i.priority === 'HIGH').length;

  const updateStatus = async (issueId: string, newStatus: string) => {
    try {
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return;

      const batch = writeBatch(db);
      const issueRef = doc(db, 'complaints', issueId);

      batch.update(issueRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Update trust score logic
      if (issue.userId && issue.status !== newStatus) {
        let scoreDelta = 0;
        if (newStatus === 'Resolved') scoreDelta = 10;
        if (newStatus === 'Rejected') scoreDelta = -10;
        
        // Handle reverting previous status points if needed
        if (issue.status === 'Resolved') scoreDelta -= 10;
        if (issue.status === 'Rejected') scoreDelta += 10;
        
        if (scoreDelta !== 0) {
          const userRef = doc(db, 'users', issue.userId);
          batch.update(userRef, {
            trustScore: increment(scoreDelta)
          });
        }

        // Notification logic
        const notifRef = doc(collection(db, 'users', issue.userId, 'notifications'));
        let title = 'Status Update';
        let message = `Your complaint "${issue.title || issue.category}" has been updated to: ${newStatus}`;
        if (newStatus === 'Resolved') {
            title = 'Complaint Resolved! 🎉';
            message = `Great news! Your issue "${issue.title || issue.category}" has been resolved. Thank you for making the city better.`;
        } else if (newStatus === 'Scheduled') {
            title = 'Maintenance Scheduled 📅';
            message = `We have scheduled maintenance for your report: "${issue.title || issue.category}".`;
        } else if (newStatus === 'In Progress') {
            title = 'Work in Progress 🚧';
            message = `Authorities are currently working on your issue: "${issue.title || issue.category}".`;
        }
        
        batch.set(notifRef, {
            title,
            message,
            isNew: true,
            createdAt: serverTimestamp(),
            complaintId: issue.id
        });
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'complaints');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'text-green-600 bg-green-50 ring-green-200';
      case 'In Progress': return 'text-blue-600 bg-blue-50 ring-blue-200';
      case 'Scheduled': return 'text-purple-600 bg-purple-50 ring-purple-200';
      case 'Pending Review': return 'text-orange-600 bg-orange-50 ring-orange-200';
      case 'Rejected': return 'text-red-600 bg-red-50 ring-red-200';
      default: return 'text-gray-600 bg-gray-50 ring-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          Admin Dashboard
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard 
          title="Total Complaints" 
          value={totalComplaints} 
          icon={<ListTodo className="w-5 h-5 text-blue-500" />} 
          bgColor="bg-blue-50"
          textColor="text-blue-700"
        />
        <MetricCard 
          title="Resolved" 
          value={resolvedIssues} 
          icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} 
          bgColor="bg-green-50"
          textColor="text-green-700"
        />
        <MetricCard 
          title="Pending" 
          value={pendingIssues} 
          icon={<Clock className="w-5 h-5 text-orange-500" />} 
          bgColor="bg-orange-50"
          textColor="text-orange-700"
        />
        <MetricCard 
          title="Urgent Needs" 
          value={urgentIssues} 
          icon={<AlertCircle className="w-5 h-5 text-red-500" />} 
          bgColor="bg-red-50"
          textColor="text-red-700"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MapIcon className="w-5 h-5 text-indigo-500" />
          Incident Heatmap
        </h3>
        <p className="text-sm text-gray-500 mb-4">Visualizing areas with high complaint frequency and priority.</p>
        
        <LiveHeatmap issues={issues} height="h-72" />
      </div>

      <div className="space-y-3 pt-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500" />
          Complaint Processing
        </h3>
        <p className="text-sm text-gray-500">Review and update the status of active complaints from citizens.</p>

        <div className="space-y-3">
          {issues.map(issue => (
            <div key={issue.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div className="flex gap-3">
                <img 
                  src={issue.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400'} 
                  alt="Issue" 
                  className={cn("w-16 h-16 rounded-xl object-cover bg-gray-100 flex-shrink-0", issue.imageUrl ? "cursor-pointer hover:opacity-80 transition-opacity" : "")}
                  onClick={() => issue.imageUrl && setSelectedImage(issue.imageUrl)}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate">{issue.title || issue.category}</h4>
                  <p className="text-sm text-gray-500 truncate">{issue.category}</p>
                  <UserNameLabel userId={issue.userId} />
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                      issue.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                      issue.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      issue.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {issue.priority}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-0.5 rounded-full">
                      <ArrowUpCircle className="w-3 h-3 text-gray-400" />
                      <span className="font-medium">{issue.upvotesCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-gray-50 pt-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                <select 
                  value={issue.status}
                  onChange={(e) => updateStatus(issue.id, e.target.value)}
                  className={cn(
                    "ml-auto text-sm font-bold bg-transparent border-0 rounded-lg focus:ring-2 focus:ring-indigo-500/20 py-1 pl-2 pr-8 appearance-none cursor-pointer text-right",
                    getStatusColor(issue.status).split(' ')[0]
                  )}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right 0.25rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`
                  }}
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          ))}
        </div>
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

function MetricCard({ title, value, icon, bgColor, textColor }: { title: string, value: number | string, icon: React.ReactNode, bgColor: string, textColor: string }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-2">
      <div className={`p-2 rounded-xl ${bgColor}`}>
        {icon}
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      <div className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>{title}</div>
    </div>
  );
}
