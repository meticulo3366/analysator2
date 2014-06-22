/* global moment, bootbox, Collections, Models, Schemata */
"use strict";

Template.parameters.helpers({
    disableConfigureChart: function() {
        var currentData = Session.get('currentData');
        return !Boolean(currentData);
    },
    disableSave: function() {
        var currentAnalysis = Session.get('currentAnalysis');
        return !currentAnalysis || !currentAnalysis._id;
    },
    disableSaveAs: function() {
        var currentAnalysis = Session.get('currentAnalysis');
        return !currentAnalysis || !currentAnalysis._id;
    },
    disableDelete: function() {
        var currentAnalysis = Session.get('currentAnalysis');
        return !currentAnalysis || !currentAnalysis._id;
    },
    validationStatus: function(kw) {
        var currentAnalysis = Session.get('currentAnalysis');
        return (currentAnalysis && Schemata.Analysis.namedContext().validateOne(currentAnalysis, kw.hash.field))?
            "" : "has-error";
    }
});

Template.parameters.events = {

    'change .connectionString' : function(event, template) {
        var currentAnalysis = Models.Analysis.getCurrent();
        currentAnalysis.connectionString = template.$(".connectionString").val();
        Models.Analysis.setCurrent(currentAnalysis);

        // cache connection string for new analysis
        if(!currentAnalysis._id) {
            localStorage.defaultConnectionString = currentAnalysis.connectionString;
        }

    },

    'change .query' : function(event, template) {
        var currentAnalysis = Models.Analysis.getCurrent();
        currentAnalysis.query = template.$(".query").val();
        Models.Analysis.setCurrent(currentAnalysis);

        // cache query for new analysis
        if(!currentAnalysis._id) {
            localStorage.deafultQuery = currentAnalysis.query;
        }
    },

    'click .run' : function(event, template) {
        event.preventDefault();

        var currentAnalysis = Models.Analysis.getCurrent();
        currentAnalysis.connectionString = template.$(".connectionString").val();
        currentAnalysis.query = template.$(".query").val();
        Models.Analysis.setCurrent(currentAnalysis);

        Meteor.call("queryDatabase", currentAnalysis.connectionString, currentAnalysis.query, function(err, results) {
            if(err) {
                bootbox.alert(err.reason);
                return;
            }

            Session.set('currentData', results);
        });
    },

    'click .configure-chart' : function(event, template) {
        event.preventDefault();
        $(".chartModal").modal();
    },

    'click .save' : function(event, template) {
        var currentAnalysis = Models.Analysis.getCurrent(),
            omit = ['_id'];

        // it's possible that we have only partly populated chart settings;
        // in this case, don't save them

        if(!currentAnalysis.chartSettings || !Schemata.ChartSettings.namedContext().validate(currentAnalysis.chartSettings)) {
            omit.push('chartSettings');
        }

        if(!Schemata.Analysis.namedContext().validate(_.omit(currentAnalysis, omit))) {
            bootbox.alert("Invalid analysis: " + _.pluck(Schemata.Analysis.namedContext().invalidKeys(), 'message').join('; '));
            return;
        }

        omit.push('owner');
        Collections.Analyses.update(currentAnalysis._id, {
            $set: _.omit(currentAnalysis, omit)
        }, {}, function(err) {
            if(err) {
                alert("Unexpected error updating record: " + err);
                return;
            }
        });
    },

    'click .save-as' : function(event, template) {
        var currentAnalysis = Models.Analysis.getCurrent(),
            omit = ['_id'];

        // it's possible that we have only partly populated chart settings;
        // in this case, don't save them

        if(!currentAnalysis.chartSettings || !Schemata.ChartSettings.namedContext().validate(currentAnalysis.chartSettings)) {
            omit.push('chartSettings');
        }

        // validate, but don't fail due to a missing name
        if(!Schemata.Analysis.namedContext().validate(_.extend(_.omit(currentAnalysis, omit), {name: 'temp'}))) {
            bootbox.alert("Invalid analysis: " + _.pluck(Schemata.Analysis.namedContext().invalidKeys(), 'message').join('; '));
            return;
        }

        omit.push('owner');bootbox.prompt("Please choose a name", function(newName) {
            if(!newName) {
                return;
            }

            var newAnalysis = Models.Analysis.create(_.extend(_.omit(currentAnalysis, omit), {name: newName}));
            Collections.Analyses.insert(newAnalysis, function(err, id) {
                if(err) {
                    alert("Unexpected error inserting record: " + err);
                    return;
                }

                newAnalysis._id = id;
                Models.Analysis.setCurrent(newAnalysis);

                Router.go('analysis', {_id: id});
            });
        });
    },

    'click .delete' : function(event, template) {
        var currentAnalysis = Models.Analysis.getCurrent();

        bootbox.confirm("Are you sure you want to delete the analysis '" + currentAnalysis.name + "'?", function(result) {
            if(result) {
                Collections.Analyses.remove(currentAnalysis._id, function(err, count) {
                    if(err) {
                        alert("Unexpected error deleting record: " + err);
                        return;
                    }

                    Router.go('new');
                });
            }
        });
    }

};

Template.results.helpers({

    fields: function() {
        var data = Session.get('currentData');
        if(!data) {
            return [];
        }

        return data.fields;
    },

    rows: function() {
        var data = Session.get('currentData');
        if(!data) {
            return [];
        }

        return data.rows.map(function(row) {
            return data.fields.map(function(field) {
                var value = row[field.name];

                if(field.dataTypeID === 1082) { // date columns
                    value = moment(value).format("MM/DD/YYYY");
                }

                return value;
            });
        });
    }
});