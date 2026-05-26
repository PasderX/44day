'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/language-context';
import { Send, Instagram, Mail, Phone } from 'lucide-react';

export default function Footer() {
  const { t } = useLanguage();

  const socialLinks = [
    { icon: Send, href: '#', label: 'Telegram' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Mail, href: '#', label: 'Email' },
    { icon: Phone, href: '#', label: 'Phone' },
  ];

  return (
    <footer className="relative bg-gradient-to-b from-transparent to-black/50 border-t border-neon-cyan/20">
      <div className="absolute inset-0 cyber-grid-bg opacity-10"></div>
      
      <div className="relative container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center cyber-glow">
                <span className="text-2xl font-bold">T</span>
              </div>
              <span className="text-3xl font-bold text-gradient neon-text">
                TerboXXX
              </span>
            </motion.div>
            <p className="text-gray-400 mb-6 max-w-md">
              {t.footer.description}
            </p>
            
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 glass-effect cyber-border rounded-lg flex items-center justify-center hover:border-neon-cyan transition-all"
                  aria-label={social.label}
                >
                  <social.icon size={20} className="text-neon-cyan" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gradient">
              {t.footer.quickLinks}
            </h3>
            <ul className="space-y-2">
              {['home', 'services', 'about', 'contact'].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item}`}
                    className="text-gray-400 hover:text-neon-cyan transition-colors"
                  >
                    {t.nav[item as keyof typeof t.nav]}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gradient">
              {t.footer.legal}
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-neon-cyan transition-colors">
                  {t.footer.terms}
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-neon-cyan transition-colors">
                  {t.footer.privacy}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} TerboXXX. {t.footer.rights}
            </p>
            
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-gray-500">Made with</span>
              <motion.span
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
                className="text-neon-pink"
              >
                ❤️
              </motion.span>
              <span className="text-gray-500">in Azerbaijan</span>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
}
