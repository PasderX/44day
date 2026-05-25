'use client';

import { motion } from 'framer-motion';
import { ExternalLink, Check } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';
import { services } from '@/lib/utils';

export default function Services() {
  const { t } = useLanguage();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <section id="services" className="relative py-24 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/5 to-transparent"></div>
      
      <div className="relative container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4 text-gradient neon-text">
            {t.services.title}
          </h2>
          <p className="text-xl text-gray-400">{t.services.subtitle}</p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service) => {
            const serviceData = t.services[service.id as keyof typeof t.services];
            
            return (
              <motion.div
                key={service.id}
                variants={item}
                whileHover={{ scale: 1.05, rotateY: 5 }}
                className="relative group"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="glass-effect cyber-border rounded-2xl p-8 h-full transition-all duration-300 group-hover:border-neon-cyan group-hover:shadow-neon">
                  {/* Popular Badge */}
                  {service.popular && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-neon-pink to-neon-purple px-4 py-1 rounded-full text-sm font-semibold cyber-glow">
                      {t.pricing.popular}
                    </div>
                  )}

                  {/* Icon */}
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-16 h-16 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-xl flex items-center justify-center text-4xl mb-6 cyber-border"
                  >
                    {service.icon}
                  </motion.div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-gradient transition-all">
                    {typeof serviceData === 'object' && 'title' in serviceData ? serviceData.title : ''}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 mb-6">
                    {typeof serviceData === 'object' && 'desc' in serviceData ? serviceData.desc : ''}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {['feature1', 'feature2', 'feature3'].map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="text-neon-cyan flex-shrink-0 mt-1" size={16} />
                        <span className="text-sm text-gray-300">
                          {typeof serviceData === 'object' && feature in serviceData 
                            ? serviceData[feature as keyof typeof serviceData] 
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div>
                      <span className="text-3xl font-bold text-gradient">{service.price}</span>
                      <span className="text-sm text-gray-400 ml-2">{service.currency}</span>
                    </div>
                    
                    <motion.a
                      href={service.link}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-lg font-semibold text-sm cyber-glow"
                    >
                      {t.pricing.buy}
                      <ExternalLink size={16} />
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
