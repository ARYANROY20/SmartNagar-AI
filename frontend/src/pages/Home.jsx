import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, CloudRain, Zap, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LiveHeatmap from '../components/LiveHeatmap';
import { formatRelativeTime } from '../lib/utils';
import { getComplaints } from '../services/api.js';

export default function Home() {
  const { role, userData, user } = useAuth();
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const loadIssues = async () => {
      try {
        const docsData = await getComplaints({ limit: 50 });
        if (isMounted) setIssues(docsData);
      } catch (error) {
        console.error('Could not load complaints', error);
      }
    };

    loadIssues();
    const interval = window.setInterval(loadIssues, 30000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const totalComplaints = issues.length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;
  const pendingCount = issues.filter(i => i.status === 'Pending Review' || i.status === 'In Progress').length;
  const urgentOrHighCount = issues.filter(i => i.priority === 'URGENT' || i.priority === 'HIGH').length;
  const garbageCount = issues.filter(i => i.category === 'Garbage & Waste').length;
  // Citizen insight cards use the current complaint set instead of static demo values.
  const riskPercent = totalComplaints ? Math.round((urgentOrHighCount / totalComplaints) * 100) : 0;
  const wastePercent = totalComplaints ? Math.round((garbageCount / totalComplaints) * 100) : 0;
  const resourcePercent = totalComplaints ? Math.round((resolvedCount / totalComplaints) * 100) : 0;
  const topIssueCounts = issues.reduce((acc, issue) => {
    const key = issue.category || 'Reported Issues';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const topIssueLabel = Object.entries(topIssueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No issue data';
  
  return (
    <div className="p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header section based on role */}
      {role === 'admin' ? (
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Admin Panel</h2>
          <p className="text-sm text-gray-500">City-wide maintenance overview.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">Hello, {userData?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'Citizen'}</h2>
          <p className="text-sm text-gray-500">Quick summary of today's city health.</p>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 gap-3">
        {role === 'admin' ? (
          <>
            <MetricCard title="TOTAL COMPLAINTS" value={totalComplaints} icon={<FileText className="w-4 h-4 text-blue-500" />} trend={`${pendingCount} active`} trendPositive={false} />
            <MetricCard title="RESOLVED" value={resolvedCount} icon={<ShieldAlert className="w-4 h-4 text-green-500" />} trend={`${resourcePercent}% resolved`} trendPositive={true} />
          </>
        ) : (
          <>
            <MetricCard title="Pending Alerts" value={pendingCount} icon={<AlertTriangle className="w-4 h-4 text-orange-500" />} />
            <MetricCard title="Resolved" value={resolvedCount} icon={<ShieldAlert className="w-4 h-4 text-green-500" />} />
          </>
        )}
      </div>

      {/* Admin Heatmap OR Citizen High Risk Zones */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800 text-sm">{role === 'admin' ? 'City Issue Density' : 'Predictive Analytics'}</h3>
          <span className="text-xs text-blue-600 font-medium">Live Map</span>
        </div>
        <LiveHeatmap issues={issues} height="h-48" />
      </div>

      {/* AI Predictive Insights (Citizen) OR Recent Complaints (Admin) */}
      {role === 'citizen' && (
        <div className="space-y-3">
           <h3 className="font-semibold text-gray-800 text-sm">AI Predictive Insights</h3>
           <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex items-start gap-3">
             <div className="mt-1 bg-red-100 p-1.5 rounded text-red-600">
               <AlertTriangle className="w-4 h-4" />
             </div>
             <div>
               <div className="flex justify-between items-center">
                 <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider">High Priority Share</h4>
                 <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-200 text-red-800 rounded">{urgentOrHighCount} REPORTS</span>
               </div>
               <p className="text-2xl font-bold text-red-700 mt-1">{riskPercent}%</p>
               <p className="text-xs text-red-600 mt-1">{topIssueLabel}</p>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-3">
             <div className="bg-green-50 p-3 rounded-xl border border-green-100">
               <div className="text-green-600 mb-1"><CloudRain className="w-4 h-4"/></div>
               <div className="text-xs text-green-800 font-medium">Waste Level</div>
               <div className="text-lg font-bold text-green-700">{wastePercent}%</div>
               <div className="text-[10px] text-green-600">{garbageCount} waste reports</div>
             </div>
             <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
               <div className="text-blue-600 mb-1"><Zap className="w-4 h-4"/></div>
               <div className="text-xs text-blue-800 font-medium">Resource Opt.</div>
               <div className="text-lg font-bold text-blue-700">{resourcePercent}%</div>
               <div className="text-[10px] text-blue-600">{resolvedCount} resolved reports</div>
             </div>
           </div>
        </div>
      )}

      {role === 'admin' && (
        <div className="space-y-3">
           <div className="flex justify-between items-center">
             <h3 className="font-semibold text-gray-800 text-sm">Recent Complaints</h3>
             <span className="text-xs text-gray-500 font-medium">{issues.length} Live</span>
           </div>
           
           <div className="space-y-2">
             {issues.length === 0 && <p className="text-sm text-gray-500 p-3 bg-white rounded-xl border border-gray-100 shadow-sm text-center">No reports yet.</p>}
             {issues.map(issue => (
               <div key={issue.id} className="bg-white border border-gray-100 p-3 rounded-xl shadow-sm flex items-start gap-3">
                 {issue.imageUrl ? (
                   <img
                     src={issue.imageUrl}
                     alt={issue.title || 'Complaint image'}
                     className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0"
                   />
                 ) : (
                   <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-gray-400">
                     <AlertTriangle className="w-5 h-5" />
                   </div>
                 )}
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start gap-2">
                     <h4 className="font-medium text-gray-900 text-sm truncate">{issue.title}</h4>
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ring-1 shrink-0 ${issue.priority === 'URGENT' ? 'bg-red-100 text-red-700 ring-red-200' : 'bg-orange-100 text-orange-700 ring-orange-200'}`}>
                       {issue.priority}
                     </span>
                   </div>
                   <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{issue.locationName}</p>
                   <p className="text-[10px] text-gray-400 mt-2">{formatRelativeTime(issue.createdAt)}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendPositive }) {
  return (
    <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">{title}</h4>
        <div className="p-1 bg-gray-50 rounded">{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className={`text-[10px] mt-1 font-medium ${trendPositive ? 'text-green-600' : 'text-orange-600'}`}>
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}
