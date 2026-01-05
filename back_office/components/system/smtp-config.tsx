"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/hooks/use-toast";
import { Loader2, Mail, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useUpdateSystemConfig } from "@/lib/hooks/use-system-config";

interface SMTPConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_password_set: boolean;
}

interface SMTPConfigProps {
  initialConfig?: Partial<SMTPConfig>;
}

export function SMTPConfiguration({ initialConfig }: SMTPConfigProps) {
  const { toast } = useToast();
  const updateConfig = useUpdateSystemConfig();
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connected" | "error">("idle");
  const [testEmail, setTestEmail] = useState("");

  const [config, setConfig] = useState<SMTPConfig>({
    smtp_host: initialConfig?.smtp_host || "localhost",
    smtp_port: initialConfig?.smtp_port || 1025,
    smtp_use_tls: initialConfig?.smtp_use_tls || false,
    smtp_use_ssl: initialConfig?.smtp_use_ssl || false,
    smtp_username: initialConfig?.smtp_username || "",
    smtp_password: initialConfig?.smtp_password || "",
    smtp_from_email: initialConfig?.smtp_from_email || "noreply@smartqueue.app",
    smtp_password_set: initialConfig?.smtp_password_set || false,
  });

  // Mettre à jour la configuration quand initialConfig change
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        smtp_host: initialConfig.smtp_host || "localhost",
        smtp_port: initialConfig.smtp_port || 1025,
        smtp_use_tls: initialConfig.smtp_use_tls || false,
        smtp_use_ssl: initialConfig.smtp_use_ssl || false,
        smtp_username: initialConfig.smtp_username || "",
        smtp_password: "", // Ne jamais pré-remplir le password
        smtp_from_email: initialConfig.smtp_from_email || "noreply@smartqueue.app",
        smtp_password_set: initialConfig.smtp_password_set || false,
      });
    }
  }, [initialConfig]);

  // Vérifier le statut de la connexion au chargement
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await apiClient.get("/admin/system/smtp/status/");
      setConnectionStatus(response.data.connected ? "connected" : "error");
    } catch (error) {
      setConnectionStatus("error");
    }
  };

  const handleSave = async () => {
    // Validation
    if (config.smtp_use_tls && config.smtp_use_ssl) {
      toast({
        title: "Erreur de configuration",
        description: "TLS et SSL ne peuvent pas être activés simultanément",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateConfig.mutateAsync({
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_use_tls: config.smtp_use_tls,
        smtp_use_ssl: config.smtp_use_ssl,
        smtp_username: config.smtp_username,
        smtp_password: config.smtp_password || undefined,
        smtp_from_email: config.smtp_from_email,
      });

      toast({
        title: "Configuration sauvegardée",
        description: "La configuration SMTP a été mise à jour avec succès",
      });

      // Vérifier la connexion après la sauvegarde
      await checkConnection();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Impossible de sauvegarder la configuration",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      toast({
        title: "Email requis",
        description: "Veuillez entrer une adresse email pour le test",
        variant: "destructive",
      });
      return;
    }

    setTesting(true);

    try {
      const response = await apiClient.post("/admin/system/smtp/test/", {
        test_email: testEmail,
      });

      toast({
        title: "Email de test envoyé",
        description: `Un email de test a été envoyé à ${testEmail}`,
      });

      setConnectionStatus("connected");
    } catch (error: any) {
      toast({
        title: "Échec du test",
        description: error.response?.data?.error || "Impossible d'envoyer l'email de test",
        variant: "destructive",
      });

      setConnectionStatus("error");
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connecté";
      case "error":
        return "Non connecté";
      default:
        return "Non vérifié";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuration SMTP
            </CardTitle>
            <CardDescription>
              Configurez le serveur SMTP pour l'envoi d'emails
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-600">{getStatusText()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Serveur et Port */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_host">Serveur SMTP</Label>
            <Input
              id="smtp_host"
              placeholder="localhost"
              value={config.smtp_host}
              onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              Exemple: localhost, smtp.gmail.com, smtp.sendgrid.net
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_port">Port</Label>
            <Input
              id="smtp_port"
              type="number"
              placeholder="1025"
              value={config.smtp_port}
              onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 1025 })}
            />
            <p className="text-xs text-gray-500">
              Ports courants: 25, 587 (TLS), 465 (SSL), 1025 (local)
            </p>
          </div>
        </div>

        {/* TLS/SSL */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smtp_use_tls">Utiliser TLS</Label>
              <p className="text-xs text-gray-500">
                Chiffrement STARTTLS (port 587)
              </p>
            </div>
            <Switch
              id="smtp_use_tls"
              checked={config.smtp_use_tls}
              onCheckedChange={(checked) => setConfig({ ...config, smtp_use_tls: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smtp_use_ssl">Utiliser SSL</Label>
              <p className="text-xs text-gray-500">
                Chiffrement SSL/TLS (port 465)
              </p>
            </div>
            <Switch
              id="smtp_use_ssl"
              checked={config.smtp_use_ssl}
              onCheckedChange={(checked) => setConfig({ ...config, smtp_use_ssl: checked })}
            />
          </div>
        </div>

        {/* Authentification */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtp_username">Nom d'utilisateur (optionnel)</Label>
            <Input
              id="smtp_username"
              placeholder="user@example.com"
              value={config.smtp_username}
              onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_password">Mot de passe (optionnel)</Label>
            <Input
              id="smtp_password"
              type="password"
              placeholder={config.smtp_password_set ? "••••••••" : "Mot de passe SMTP"}
              value={config.smtp_password}
              onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
            />
            {config.smtp_password_set && !config.smtp_password && (
              <p className="text-xs text-gray-500">
                Un mot de passe est déjà configuré. Laissez vide pour conserver l'actuel.
              </p>
            )}
          </div>
        </div>

        {/* Email expéditeur */}
        <div className="space-y-2">
          <Label htmlFor="smtp_from_email">Email expéditeur</Label>
          <Input
            id="smtp_from_email"
            type="email"
            placeholder="noreply@smartqueue.app"
            value={config.smtp_from_email}
            onChange={(e) => setConfig({ ...config, smtp_from_email: e.target.value })}
          />
        </div>

        {/* Test de configuration */}
        <div className="border-t pt-4 space-y-4">
          <h4 className="font-medium">Test de configuration</h4>

          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={testing} variant="outline">
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Tester
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Un email de test sera envoyé à cette adresse pour valider la configuration
          </p>
        </div>

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              "Sauvegarder la configuration"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
