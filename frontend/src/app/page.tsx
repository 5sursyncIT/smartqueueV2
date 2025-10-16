"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function Home() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: ""
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Le nom est requis";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = "Le sujet est requis";
    }
    
    if (!formData.message.trim()) {
      newErrors.message = "Le message est requis";
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});
    
    // Simuler l'envoi du formulaire
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSubmitSuccess(true);
      setFormData({ firstName: "", lastName: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Effacer l'erreur quand l'utilisateur commence à taper
    if (errors[id]) {
      setErrors(prev => ({
        ...prev,
        [id]: ""
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">🌍</span>
              </div>
              <span className="text-xl font-bold text-gray-800 dark:text-white">
                Smart<span className="text-blue-600">Queue</span>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Fonctionnalités
              </a>
              <a href="#testimonials" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Témoignages
              </a>
              <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Contact
              </a>
            </div>
            <Button variant="outline" size="sm">
              Contact
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6">
              Réinventez l&apos;expérience
              <span className="text-blue-600 block">d&apos;attente</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Solution SaaS 100% africaine de gestion de files d&apos;attente intelligente 
              conçue pour les entreprises sénégalaises et leurs clients.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button size="lg" className="px-8">
                Commencer gratuitement
              </Button>
              <Button variant="outline" size="lg" className="px-8">
                Voir la démo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">250+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Entreprises</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">500K+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Clients servis</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">99.9%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Disponibilité</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Support local</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-Action Cards */}
       <section className="py-16 bg-white dark:bg-gray-900">
         <div className="container mx-auto px-4">
           <div className="text-center mb-12">
             <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
               Comment souhaitez-vous utiliser SmartQueue ?
             </h2>
             <p className="text-lg text-gray-600 dark:text-gray-300">
               Choisissez le parcours qui correspond à vos besoins
             </p>
           </div>

           <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
             {/* Enterprise Subscription Card */}
             <Card className="hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
               <CardHeader className="pb-4">
                 <CardTitle className="text-2xl flex items-center gap-3 text-gray-800 dark:text-white">
                   <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                     <span className="text-blue-600 dark:text-blue-400 text-xl">🏢</span>
                   </div>
                   Entreprise
                 </CardTitle>
                 <CardDescription className="text-gray-600 dark:text-gray-300">
                   Solution complète pour votre business
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <ul className="space-y-3 text-sm">
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Gestion multi-files d&apos;attente
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Analytics en temps réel
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Support prioritaire 24/7
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     API complète et documentation
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Personnalisation avancée
                   </li>
                 </ul>
                 <div className="text-center pt-4">
                   <Button asChild className="w-full" size="lg">
                     <Link href="/enterprise/subscribe">
                       Démarrer l&apos;essai gratuit
                     </Link>
                   </Button>
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                     14 jours gratuits, sans carte de crédit
                   </p>
                 </div>
               </CardContent>
             </Card>

             {/* Individual Customer Card */}
             <Card className="hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
               <CardHeader className="pb-4">
                 <CardTitle className="text-2xl flex items-center gap-3 text-gray-800 dark:text-white">
                   <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                     <span className="text-green-600 dark:text-green-400 text-xl">👤</span>
                   </div>
                   Client
                 </CardTitle>
                 <CardDescription className="text-gray-600 dark:text-gray-300">
                   Rejoignez une file d&apos;attente en toute simplicité
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <ul className="space-y-3 text-sm">
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Inscription en 30 secondes
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Notifications en temps réel
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Estimation précise du temps
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Support client disponible
                   </li>
                   <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                     <div className="w-5 h-5 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                       <span className="text-green-600 dark:text-green-400 text-xs font-bold">✓</span>
                     </div>
                     Expérience sans contact
                   </li>
                 </ul>
                 <div className="text-center pt-4">
                   <Button asChild variant="outline" className="w-full" size="lg">
                     <Link href="/customer/register">
                       Rejoindre une file
                     </Link>
                   </Button>
                   <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                     Gratuit et sans inscription
                   </p>
                 </div>
               </CardContent>
             </Card>
           </div>
         </div>
       </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Fonctionnalités puissantes
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour transformer l&apos;expérience d&apos;attente de vos clients
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { icon: '⚡', title: 'Rapide', desc: 'Inscription en moins de 30 secondes' },
              { icon: '🔒', title: 'Sécurisé', desc: 'Données cryptées et conformes RGPD' },
              { icon: '📊', title: 'Analytics', desc: 'Statistiques en temps réel' },
              { icon: '🔔', title: 'Notifications', desc: 'Alertes push et SMS' },
              { icon: '🌍', title: 'Multi-langues', desc: 'Support 15+ langues' },
              { icon: '🔄', title: 'Intégrations', desc: 'API REST et Webhooks' },
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Nos Tarifs Adaptés
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Des solutions abordables conçues pour les entreprises sénégalaises
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Basic Plan */}
            <Card className="text-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors shadow-md hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800 dark:text-white">
                  Démarrer
                </CardTitle>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  25 000 FCFA
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/mois</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Parfait pour les petites entreprises
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Jusqu'à 2 guichets
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    500 tickets/mois
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Support email
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Application mobile
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Commencer
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Plan - Featured */}
            <Card className="text-center bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 relative shadow-xl scale-105">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Populaire
              </div>
              <CardHeader>
                <CardTitle className="text-xl text-gray-800 dark:text-white">
                  Professionnel
                </CardTitle>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  50 000 FCFA
                  <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/mois</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pour les entreprises en croissance
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Jusqu'à 5 guichets
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Tickets illimités
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Support téléphonique
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Rapports avancés
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Intégration API
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Choisir ce plan
                </Button>
              </CardFooter>
            </Card>

            {/* Enterprise Plan */}
            <Card className="text-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors shadow-md hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800 dark:text-white">
                  Entreprise
                </CardTitle>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  Sur mesure
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pour les grandes organisations
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Guichets illimités
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Support dédié 24/7
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Déploiement sur site
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Formation personnalisée
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    Développements sur mesure
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Nous contacter
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
       <section id="testimonials" className="py-20 bg-gray-50 dark:bg-gray-900">
         <div className="container mx-auto px-4">
           <div className="text-center mb-12">
             <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
               Ils nous font confiance
             </h2>
             <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
               Découvrez ce que nos clients disent de leur expérience SmartQueue
             </p>
           </div>
           
           <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
             {[
               {
                 text: "SmartQueue a révolutionné notre service client. Réduction de 70% du temps d'attente dans nos agences !",
                 author: "Aminata S., Bank of Africa Sénégal",
                 role: "Responsable Service Client"
               },
               {
                 text: "Solution parfaite pour nos centres de santé. Les patients adorent l'inscription mobile.",
                 author: "Dr. Mamadou D., Polyclinique de Dakar",
                 role: "Directeur Médical"
               },
               {
                 text: "Idéal pour la restauration rapide à Dakar. Nos clients évitent les files d'attente.",
                 author: "Ousmane T., Restaurant Le Délicieux",
                 role: "Propriétaire"
               }
             ].map((testimonial, index) => (
               <Card key={index} className="text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                 <CardContent className="pt-8 pb-6 px-6">
                   <div className="flex justify-center mb-4">
                     <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                       <span className="text-yellow-500 dark:text-yellow-400 text-xl">"</span>
                     </div>
                   </div>
                   <div className="text-yellow-400 text-xl mb-4 flex justify-center">
                     ★★★★★
                   </div>
                   <p className="text-gray-700 dark:text-gray-300 mb-4 italic leading-relaxed">
                     "{testimonial.text}"
                   </p>
                   <div className="font-semibold text-gray-800 dark:text-white mb-1">
                     {testimonial.author}
                   </div>
                   <div className="text-sm text-gray-600 dark:text-gray-400">
                     {testimonial.role}
                   </div>
                 </CardContent>
               </Card>
             ))}
           </div>
         </div>
       </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              Contactez-nous
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Une question ? Un projet ? Notre équipe est à votre écoute pour répondre à toutes vos demandes.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Contact Information */}
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
                Nos coordonnées
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Email</h4>
                    <p className="text-gray-600 dark:text-gray-300">contact@smartqueue.sn</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Téléphone</h4>
                    <p className="text-gray-600 dark:text-gray-300">+221 33 820 00 00</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-white">Adresse</h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Immeuble Liberté 6<br />
                      Avenue Léopold Sédar Senghor<br />
                      Dakar, Sénégal
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <Card className="bg-gray-50 dark:bg-gray-700 border-0">
                <CardContent className="pt-6">
                  {submitSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                        Message envoyé !
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Merci pour votre message. Notre équipe vous répondra dans les plus brefs délais.
                      </p>
                      <Button 
                        onClick={() => setSubmitSuccess(false)} 
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                      >
                        Envoyer un autre message
                      </Button>
                    </div>
                  ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">
                            Prénom
                          </Label>
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="Votre prénom"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className={`bg-white dark:bg-gray-600 ${
                              errors.firstName ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'
                            }`}
                          />
                          {errors.firstName && (
                            <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">
                            Nom
                          </Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Votre nom"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className={`bg-white dark:bg-gray-600 ${
                              errors.lastName ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'
                            }`}
                          />
                          {errors.lastName && (
                            <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                          Email
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="votre@email.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`bg-white dark:bg-gray-600 ${
                            errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'
                          }`}
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="subject" className="text-gray-700 dark:text-gray-300">
                          Sujet
                        </Label>
                        <Input
                          id="subject"
                          type="text"
                          placeholder="Objet de votre message"
                          value={formData.subject}
                          onChange={handleInputChange}
                          className={`bg-white dark:bg-gray-600 ${
                            errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'
                          }`}
                        />
                        {errors.subject && (
                          <p className="text-red-500 text-sm mt-1">{errors.subject}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">
                          Message
                        </Label>
                        <textarea
                          id="message"
                          rows={4}
                          placeholder="Votre message..."
                          value={formData.message}
                          onChange={handleInputChange}
                          className={`w-full px-3 py-2 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.message ? 'border-red-500' : 'border-gray-300 dark:border-gray-500'
                          }`}
                        />
                        {errors.message && (
                          <p className="text-red-500 text-sm mt-1">{errors.message}</p>
                        )}
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Envoi en cours...
                          </>
                        ) : (
                          "Envoyer le message"
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Q</span>
                </div>
                <span className="text-xl font-bold">SmartQueue</span>
              </div>
              <p className="text-gray-400">
                Solution innovante de gestion de files d&apos;attente.
              </p>
            </div>
            
            {[
              {
                title: "Produit",
                links: ["Fonctionnalités", "Tarifs", "API", "Intégrations"]
              },
              {
                title: "Support", 
                links: ["Documentation", "Guide", "Contact", "Status"]
              },
              {
                title: "Entreprise",
                links: ["À propos", "Blog", "Carrières", "Presse"]
              }
            ].map((section, index) => (
              <div key={index}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 SmartQueue. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
