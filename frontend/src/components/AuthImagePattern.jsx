import { motion } from "framer-motion";

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12 animate-fadeIn">
      <div className="max-w-md text-center">
        {/* ✅ Animated Grid Pattern */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="aspect-square rounded-2xl bg-primary/10"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: (i % 3) * 0.3, // ✅ Randomized delay for wave effect
              }}
            />
          ))}
        </div>

        {/* ✅ Title & Subtitle */}
        <motion.h2
          className="text-2xl font-bold mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {title}
        </motion.h2>
        <motion.p
          className="text-base-content/60"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
