#!/bin/bash

# This script is no longer needed for the core functionality 
# as PostgreSQL is managed directly through supervisord and 
# initialization is handled by Docker's PostgreSQL entrypoint scripts

# However, we'll keep this file for any custom setup that may be needed
echo "Starting services with supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
