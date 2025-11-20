import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { PLAYER_ROLES } from "@shared/schema";
import CircularProgress from "./CircularProgress";

interface RoleSpecializationManagerProps {
  value: Record<string, number>;
  onChange: (specializations: Record<string, number>) => void;
}

export default function RoleSpecializationManager({ value, onChange }: RoleSpecializationManagerProps) {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [percentage, setPercentage] = useState<number>(0);

  const totalPercentage = Object.values(value).reduce((sum, val) => sum + val, 0);
  const isValid = totalPercentage === 100;
  const remainingPercentage = 100 - totalPercentage;

  const addSpecialization = () => {
    if (!selectedRole || percentage <= 0) return;
    
    const newValue = { ...value, [selectedRole]: percentage };
    onChange(newValue);
    setSelectedRole("");
    setPercentage(0);
  };

  const removeSpecialization = (role: string) => {
    const newValue = { ...value };
    delete newValue[role];
    onChange(newValue);
  };

  const updatePercentage = (role: string, newPercentage: number) => {
    onChange({ ...value, [role]: newPercentage });
  };

  const availableRoles = PLAYER_ROLES.filter(role => !value[role]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">Specializzazione Ruoli (100% Totale)</h3>
        <div className="flex items-center gap-3">
          <CircularProgress 
            percentage={totalPercentage} 
            size={60} 
            strokeWidth={6}
            color={isValid ? "#00eaff" : "#ff4081"}
          />
        </div>
      </div>

      {/* Current Specializations */}
      {Object.keys(value).length > 0 && (
        <div className="space-y-2">
          {Object.entries(value).map(([role, percent]) => (
            <div key={role} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex-1 flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary font-semibold">
                  {role}
                </Badge>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={percent}
                  onChange={(e) => updatePercentage(role, parseInt(e.target.value) || 0)}
                  className="w-20 h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSpecialization(role)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Specialization */}
      {availableRoles.length > 0 && remainingPercentage > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Aggiungi nuovo ruolo (rimanente: <span className={remainingPercentage > 0 ? "text-primary font-semibold" : ""}>{remainingPercentage}%</span>)
          </p>
          <div className="flex items-center gap-2">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              max={remainingPercentage}
              value={percentage || ""}
              onChange={(e) => setPercentage(parseInt(e.target.value) || 0)}
              placeholder="%"
              className="w-20"
            />
            <Button
              onClick={addSpecialization}
              disabled={!selectedRole || percentage <= 0 || percentage > remainingPercentage}
              size="sm"
              className="neon-glow-cyan"
            >
              Aggiungi
            </Button>
          </div>
        </div>
      )}

      {/* Validation Message */}
      {!isValid && Object.keys(value).length > 0 && (
        <p className="text-xs text-destructive font-semibold">
          ⚠️ Il totale deve essere esattamente 100% (attuale: {totalPercentage}%)
        </p>
      )}

      {/* Quick Fill Button */}
      {Object.keys(value).length === 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (PLAYER_ROLES[0]) {
              onChange({ [PLAYER_ROLES[0]]: 100 });
            }
          }}
          className="w-full"
        >
          Imposta ruolo singolo (100%)
        </Button>
      )}
    </div>
  );
}
