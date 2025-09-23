import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auditLog = (action, resource) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send function to log after successful operation
    res.send = function(body) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Log the audit entry asynchronously
        setImmediate(async () => {
          try {
            // Determine IP in a safer way
            const ipAddress = req.ip || (req.socket && req.socket.remoteAddress) || (req.connection && req.connection.remoteAddress) || null;

            await prisma.auditLog.create({
              data: {
                userId: req.user?.id || null,
                action: action,
                resource: resource,
                resourceId: req.params?.id || null,
                newValues: JSON.stringify(req.body || {}),
                ipAddress,
                userAgent: req.get ? req.get('User-Agent') : null
              }
            });
          } catch (error) {
            // Don't break main flow if audit logging fails
            console.error('Audit log error:', error);
          }
        });
      }
      
      // Call original send function
      return originalSend.call(this, body);
    };
    
    next();
  };
};

export default auditLog;