import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Q</span>
              </div>
              <span className="text-xl font-bold text-gray-800 dark:text-white">
                Smart<span className="text-blue-600">Queue</span>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Fonctionnalités
              </a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                Tarifs
              </a>
              <a href="#about" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">
                À propos
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
              Solution SaaS complète de gestion de files d&apos;attente intelligente 
              pour les entreprises et leurs clients.
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
                <div className="text-3xl font-bold text-blue-600">500+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Entreprises</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">1M+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Clients servis</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">99.9%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Disponibilité</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">24/7</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Support</div>
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

      {/* Testimonials */}
       <section className="py-20 bg-gray-50 dark:bg-gray-900">
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
                 text: "SmartQueue a transformé notre gestion de clientèle. Temps d'attente réduit de 65% !",
                 author: "Marie D., Restaurant Le Gourmet",
                 role: "Directrice"
               },
               {
                 text: "L'API est excellente et le support technique est réactif. Une solution complète.",
                 author: "Thomas L., Clinique Médicale",
                 role: "Responsable IT"
               },
               {
                 text: "Nos clients adorent pouvoir s'inscrire à distance. Simple et efficace.",
                 author: "Sophie M., Salon de coiffure",
                 role: "Gérante"
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
                    <p className="text-gray-600 dark:text-gray-300">support@smartqueue.fr</p>
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
                    <p className="text-gray-600 dark:text-gray-300">+33 1 23 45 67 89</p>
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
                      123 Avenue des Entrepreneurs<br />
                      75001 Paris, France
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <Card className="bg-gray-50 dark:bg-gray-700 border-0">
                <CardContent className="pt-6">
                  <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first-name" className="text-gray-700 dark:text-gray-300">
                          Prénom
                        </Label>
                        <Input
                          id="first-name"
                          type="text"
                          placeholder="Votre prénom"
                          className="bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last-name" className="text-gray-700 dark:text-gray-300">
                          Nom
                        </Label>
                        <Input
                          id="last-name"
                          type="text"
                          placeholder="Votre nom"
                          className="bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
                        />
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
                        className="bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="subject" className="text-gray-700 dark:text-gray-300">
                        Sujet
                      </Label>
                      <Input
                        id="subject"
                        type="text"
                        placeholder="Objet de votre message"
                        className="bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="message" className="text-gray-700 dark:text-gray-300">
                        Message
                      </Label>
                      <textarea
                        id="message"
                        rows={4}
                        placeholder="Votre message..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                      Envoyer le message
                    </Button>
                  </form>
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
