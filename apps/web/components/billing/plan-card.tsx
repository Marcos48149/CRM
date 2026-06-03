import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PlanCardProps {
  name: string;
  price: string;
  description: string;
  messagesLimit: string;
  workflowsLimit: string;
  integrations: string[];
  isCurrent: boolean;
  onUpgrade?: () => void;
  loading?: boolean;
}

export function PlanCard({
  name,
  price,
  description,
  messagesLimit,
  workflowsLimit,
  integrations,
  isCurrent,
  onUpgrade,
  loading,
}: PlanCardProps) {
  return (
    <Card className={`relative ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
      {isCurrent && (
        <Badge className="absolute -top-2 -right-2" variant="default">
          Plan actual
        </Badge>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-3xl font-bold">
          {price}
          <span className="text-sm font-normal text-slate-500">/mes</span>
        </p>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> {messagesLimit}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span> {workflowsLimit}
          </li>
          {integrations.map((i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-green-500">✓</span> {i}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            Plan actual
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={onUpgrade}
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
