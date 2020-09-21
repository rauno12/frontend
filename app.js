new Vue({
    el: '#app',
    data: {
        // Configure API endpoint URL
        CONF_API_ENDPOINT: 'http://api.softartist.ee:8888',

        // Form related data
        formUsername : '',
        formAgreeOfTerms : false,
        formSectors: [],
        formSuccessfulSubmitTimestamp: false,
        formErrors: [],
        sectors: [],
    },
    created() {
        // Load sector options to form from API
        this.formLoadSectors();

        // Load form values by sessionId if active session
        let activeSessionId = this.getActiveSessionId();
        if (activeSessionId) {
            this.formLoadValuesBySession(activeSessionId);
        }
        
    },
    methods: {
        /**
         * Load form sector options from API
         */
        formLoadSectors: function () {
            axios.get(this.CONF_API_ENDPOINT + '/sectors')
            .then((response) => {
                // Build tree structured array from API response (flat structured array) 
                let sectorsTree = this.mapApiSectorsToTree(response.data);
                // Update (global) this.sectors data recursively
                this.printSectorsTree(sectorsTree);

            }, (error) => {console.log(error)});
        },

        /**
         * Fulfill form by session data. 
         * If session is active, make API call for getting relative form values.
         * Form will be empty if there is no active session.
         */
        formLoadValuesBySession: function (sessionId) {
            axios.get(this.CONF_API_ENDPOINT + '/submission/' + sessionId)
            .then((response) => {
                let responseData = response.data;
                this.formUsername = responseData.username;
                this.formSectors = responseData.sectors;
                this.formAgreeOfTerms = responseData.is_agree_of_terms
            }, (error) => {console.log(error)});
        },

        /**
         * Process form after submit. Validate and communicate with API
         */
        formProcess: function() {
            // Validate form values
            if (!this.formValidate()) {
                return false;
            }

            // Construct request body for API call
            let body = JSON.stringify({ 
                username: this.formUsername,
                is_agree_of_terms: this.formAgreeOfTerms,
                sectors: this.formSectors
            });

            // Derermine if we have to insert new submission or update existing one
            let activeSessionId = this.getActiveSessionId();
            if (activeSessionId) {
                // Update existing submission
                axios.put(this.CONF_API_ENDPOINT + '/submission/' + activeSessionId, body)
                .then((error) => {console.log(error)});
            }
            else {
                // Insert new submission
                axios.post(this.CONF_API_ENDPOINT + '/submission/0', body)
                .then(response => {
                    let newSessionId = response.data.session_id;
                    this.setActiveSessionId(newSessionId)
                    this.formLoadValuesBySession(newSessionId);
                }, (error) => {console.log(error)});
            }

            this.formSuccessfulSubmitTimestamp = new Date().toLocaleString();
        },

        /**
         * Form validation
         */
        formValidate: function () {
            this.formErrors = [];
            if (this.formUsername && this.formSectors.length && this.formAgreeOfTerms) {
                return true;
            }

            if (!this.formUsername) {
                this.formErrors.push('Name is required.');
            }
            if (!this.formSectors.length) {
                this.formErrors.push('At least one sectors is required.');
            }
            if (!this.formAgreeOfTerms) {
                this.formErrors.push('Agree of terms is required.');
            }

            this.formSuccessfulSubmitTimestamp = false;
        },

        /**
         * Initialise form values for new submisson
         */
        formInitValues: function () {
            this.formUsername = '';
            this.formAgreeOfTerms = false;
            this.formSectors = [];
            this.formSuccessfulSubmitTimestamp = false;
            this.formErrors = [];
        },

        /**
         * Map flat structured (parent/child) array list to tree structured multidimensional array
         * 
         * @param {array} list 
         */
        mapApiSectorsToTree: function (list) {
            var map = {}, node, tree = [], i;

            for (i = 0; i < list.length; i += 1) {
                map[list[i].id] = i;
                list[i].children = [];
            }

            for (i = 0; i < list.length; i += 1) {
                node = list[i];
                if (node.parent_id !== null) {
                    list[map[node.parent_id]].children.push(node);
                } else {
                    tree.push(node);
                }
            }
            return tree;
        },

        /**
         * Function will process given tree array recursively  
         * Print means basically update (global) this.sectors data value
         * 
         * @param {array} tree 
         * @param {int} depth 
         */
        printSectorsTree: function(tree, depth=-1) {
            if(tree.length > 0) {
                depth++;
                tree.forEach((node) =>  {
                    // Reformat node name for displaying it as tree structure
                    node.name = "----" . repeat(depth) + node.name;
                    this.sectors.push(node);
                    this.printSectorsTree(node.children, depth);
                });
            }
        },
        
        /**
         * Sets the given sessionId as active session. Basicaly starts new session.
         * @param {string} sessionId 
         */
        setActiveSessionId: function (sessionId) {
            localStorage.sessionId = sessionId;
        },

        /**
         * Return sessionId if exist active session
         */
        getActiveSessionId: function () {
            if (typeof localStorage.sessionId === 'undefined') { 
                return false;
            }

            return localStorage.sessionId;
        },

        /**
         * 
         * @param {object} event 
         */
        destroySession: function (event) {
            delete localStorage.sessionId;
            this.formInitValues();
        },
    }
});