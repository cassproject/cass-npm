/**
 *  Importer methods to copy or link to competencies that already
 *  exist in another framework in a CASS instance.
 * 
 *  @author devlin.junker@eduworks.com
 *  @module org.cassproject
 *  @class FrameworkImport
 *  @static
 *  @extends Importer
 */
module.exports = class FrameworkImport{
    static savedComp = 0;
    static savedRel = 0;
    static targetUsable = null;
    static competencies = null;
    static relations = null;
    static compMap = null;
    /**
     *  Copies or links competencies that exist in one framework in a CASS instance,
     *  to another different framework in the same CASS instance.
     * 
     *  @param {EcFramework}                    source
     *                                          Framework to copy or link the competencies from
     *  @param {EcFramework}                    target
     *                                          Framework to add the copied or linked competencies to
     *  @param {boolean}                        copy
     *                                          Flag indicating whether or not to copy or link the competencies in the source framework
     *  @param {String}                         serverUrl
     *                                          URL Prefix for the created competencies if copied
     *  @param {EcIdentity}                     owner
     *                                          EcIdentity that will own the created competencies if copied
     *  @param {Callback1<Array<EcCompetency>>} success
     *                                          Callback triggered after succesfully copying or linking all of the competencies,
     *                                          returns an array of the new or linked competencies
     *  @param {Callback1<Object>}              [failure]
     *                                          Callback triggered if an error occurred while creating the competencies
     *  @memberOf FrameworkImport
     *  @method importCompetencies
     *  @static
     */
    static importCompetencies(source, target, copy, serverUrl, owner, success, failure, repo) {
        if (source == null) {
            failure("Source Framework not set");
            return;
        }
        if (target == null) {
            failure("Target Framework not Set");
            return;
        }
        FrameworkImport.targetUsable = target;
        if (source.competency == null || source.competency.length == 0) {
            failure("Source Has No Competencies");
            return;
        }
        FrameworkImport.competencies = [];
        FrameworkImport.relations = [];
        if (copy) {
            FrameworkImport.compMap = {};
            FrameworkImport.savedComp = 0;
            FrameworkImport.savedRel = 0;
            for (var i = 0; i < source.competency.length; i++) {
                var id = source.competency[i];
                EcCompetency.get(id, function(comp) {
                    var competency = new EcCompetency();
                    competency.copyFrom(comp);
                    if (repo == null || repo.selectedServer.indexOf(serverUrl) != -1) 
                        competency.generateId(serverUrl);
                     else 
                        competency.generateShortId(serverUrl);
                    FrameworkImport.compMap[comp.shortId()] = competency.shortId();
                    if (owner != null) 
                        competency.addOwner(owner.ppk.toPk());
                    var id = competency.id;
                    Task.asyncImmediate(function(o) {
                        var keepGoing = o;
                        competency.save(function(str) {
                            FrameworkImport.savedComp++;
                            FrameworkImport.targetUsable.addCompetency(id);
                            if (FrameworkImport.savedComp == FrameworkImport.competencies.length) {
                                FrameworkImport.targetUsable.save(function(p1) {
                                    for (var i = 0; i < source.relation.length; i++) {
                                        var id = source.relation[i];
                                        EcAlignment.get(id, function(rel) {
                                            var relation = new EcAlignment();
                                            relation.copyFrom(rel);
                                            if (repo == null || repo.selectedServer.indexOf(serverUrl) != -1) 
                                                relation.generateId(serverUrl);
                                             else 
                                                relation.generateShortId(serverUrl);
                                            relation.source = FrameworkImport.compMap[rel.source];
                                            relation.target = FrameworkImport.compMap[rel.target];
                                            if (owner != null) 
                                                relation.addOwner(owner.ppk.toPk());
                                            var id = relation.id;
                                            Task.asyncImmediate(function(o) {
                                                var keepGoing2 = o;
                                                relation.save(function(str) {
                                                    FrameworkImport.savedRel++;
                                                    FrameworkImport.targetUsable.addRelation(id);
                                                    if (FrameworkImport.savedRel == FrameworkImport.relations.length) {
                                                        FrameworkImport.targetUsable.save(function(p1) {
                                                            success(FrameworkImport.competencies, FrameworkImport.relations);
                                                        }, function(p1) {
                                                            failure(p1);
                                                        }, repo);
                                                    }
                                                    keepGoing2();
                                                }, function(str) {
                                                    failure("Trouble Saving Copied Competency");
                                                    keepGoing2();
                                                }, repo);
                                            });
                                            FrameworkImport.relations.push(relation);
                                        }, function(str) {
                                            failure(str);
                                        });
                                    }
                                }, function(p1) {
                                    failure(p1);
                                }, repo);
                            }
                            keepGoing();
                        }, function(str) {
                            failure("Trouble Saving Copied Competency");
                            keepGoing();
                        }, repo);
                    });
                    FrameworkImport.competencies.push(competency);
                }, function(str) {
                    failure(str);
                });
            }
        } else {
            for (var i = 0; i < source.competency.length; i++) {
                if (target.competency == null || (target.competency.indexOf(source.competency[i]) == -1 && target.competency.indexOf(EcRemoteLinkedData.trimVersionFromUrl(source.competency[i])) == -1)) {
                    EcCompetency.get(source.competency[i], function(comp) {
                        FrameworkImport.competencies.push(comp);
                        FrameworkImport.targetUsable.addCompetency(comp.id);
                        if (FrameworkImport.competencies.length == source.competency.length) {
                            delete (FrameworkImport.targetUsable)["competencyObjects"];
                            FrameworkImport.targetUsable.save(function(p1) {
                                for (var i = 0; i < source.relation.length; i++) {
                                    if (target.relation == null || (target.relation.indexOf(source.relation[i]) == -1 && target.relation.indexOf(EcRemoteLinkedData.trimVersionFromUrl(source.competency[i])) == -1)) {
                                        EcAlignment.get(source.relation[i], function(relation) {
                                            FrameworkImport.relations.push(relation);
                                            FrameworkImport.targetUsable.addRelation(relation.id);
                                            if (FrameworkImport.relations.length == source.relation.length) {
                                                delete (FrameworkImport.targetUsable)["competencyObjects"];
                                                Task.asyncImmediate(function(o) {
                                                    var keepGoing = o;
                                                    FrameworkImport.targetUsable.save(function(p1) {
                                                        success(FrameworkImport.competencies, FrameworkImport.relations);
                                                        keepGoing();
                                                    }, function(p1) {
                                                        failure(p1);
                                                        keepGoing();
                                                    }, repo);
                                                });
                                            }
                                        }, function(p1) {
                                            failure(p1);
                                        });
                                    }
                                }
                            }, function(p1) {
                                failure(p1);
                            }, repo);
                        }
                    }, function(p1) {
                        failure(p1);
                    });
                }
            }
        }
    };
};