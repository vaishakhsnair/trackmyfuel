import { Plus, Fuel } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const QuickActions = () => {
  return (
    <div className="metric-card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Fuel className="w-5 h-5 text-primary" />
        <h3 className="text-card-foreground font-semibold">Quick Actions</h3>
      </div>
      
      <div className="space-y-3">
        <Link to="/add-entry" className="block">
          <button className="quick-action-btn w-full p-4 flex flex-col items-center space-y-2">
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Add Fuel Entry</span>
          </button>
        </Link>
        <Link to="/add-entry?rupees=500" className="block">
          <Button variant="outline" className="w-full p-4">Quick ₹500 top-up</Button>
        </Link>
        <Link to="/add-entry?full=1" className="block">
          <Button variant="outline" className="w-full p-4">Full tank</Button>
        </Link>
        
        <Link to="/history" className="block">
          <Button variant="outline" className="w-full p-4 flex items-center space-x-2">
            <span>View All Entries</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
