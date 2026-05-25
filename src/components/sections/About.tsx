'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Users, Award } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

export default function About() {
  const { t, language } = useLanguage();

  const features = [
    {
      icon: Shield,
      title: {
        az: 'Təhlükəsizlik',
        ru: 'Безопасность',
        en: 'Security',
      },
      desc: {
        az: 'Tam məxfilik və təhlükəsiz əməliyyatlar',
        ru: 'Полная конфиденциальность и безопасные операции',
        en: 'Complete privacy and secure operations',
      },
    },
    {
      icon: Zap,
      title: {
        az: 'Sürət',
        ru: 'Скорость',
        en: 'Speed',
      },
      desc: {
        az: 'Xidmətlərin dərhal çatdırılması',
        ru: 'Мгновенная доставка услуг',
        en: 'Instant service delivery',
      },
    },
    {
      icon: Users,
      title: {
        az: 'Dəstək',
        ru: 'Поддержка',
        en: 'Support',
      },
      desc: {
        az: '24/7 peşəkar dəstək komandası',
        ru: '24/7 профессиональная команда поддержки',
        en: '24/7 professional support team',
      },
    },
    {
      icon: Award,
      title: {
        az: 'Keyfiyyət',
        ru: 'Качество',
        en: 'Quality',
      },
      desc: {
        az: 'Premium xidmətlər, ən yaxşı qiymətlər',
        ru: 'Премиум услуги, лучшие цены',
        en: 'Premium services, best prices',
      },
    },
  ];

  const stats = [
    {
      number: '10K+',
      label: {
        az: 'Müştərilər',
        ru: 'Клиентов',
        en: 'Clients',
      },
    },
    {
      number: '50K+',
      label: {
        az: 'Sifarişlər',
        ru: 'Заказов',
        en: 'Orders',
      },
    },
    {
      number: '99.9%',
      label: {
        az: 'Məmnuniyyət',
        ru: 'Довольных',
        en: 'Satisfaction',
      },
    },
    {
      number: '24/7',
      label: {
        az: 'Dəstək',
        ru: 'Поддержка',
        en: 'Support',
      },
    },
  ];

  return (
    <section id="about" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative container mx-auto px-4">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4 text-gradient neon-text">
            {language === 'az' ? 'Niyə TerboXXX?' : language === 'ru' ? 'Почему TerboXXX?' : 'Why TerboXXX?'}
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {language === 'az' 
              ? 'Rəqəmsal dünyada ən etibarlı tərəfdaşınız'
              : language === 'ru'
              ? 'Ваш самый надежный партнер в цифровом мире'
              : 'Your most reliable partner in the digital world'}
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 rounded-2xl flex items-center justify-center cyber-border"
              >
                <feature.icon className="text-neon-cyan" size={32} />
              </motion.div>
              <h3 className="text-xl font-bold mb-2 text-white">
                {feature.title[language]}
              </h3>
              <p className="text-gray-400">
                {feature.desc[language]}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-effect cyber-border rounded-3xl p-8 md:p-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                  className="text-4xl md:text-5xl font-bold text-gradient mb-2"
                >
                  {stat.number}
                </motion.div>
                <div className="text-gray-400">
                  {stat.label[language]}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
