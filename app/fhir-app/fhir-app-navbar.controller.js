'use strict';

angular.module('lformsApp')
  .controller('NavBarCtrl', [
      '$scope', '$http', '$mdDialog', 'selectedFormData', 'fhirService', 'FileUploader',
      function ($scope, $http, $mdDialog, selectedFormData, fhirService, FileUploader) {

        $scope.search = {};

        // See https://github.com/nervgh/angular-file-upload/wiki/Introduction on
        // usage of angular-file-upload.
        $scope.uploader = new FileUploader({removeAfterUpload: true});

        // Saved QuestionnaireResponse of a patient
        $scope.listSavedQR = [];

        // Questionnaire created by all users using the LHC form builder
        $scope.listSavedQ = [];

        // the current form displayed
        $scope.formSelected = {};

        // Customized OBR fields for DiagnosticReport forms
        $scope.obrItems = [
          {
            "question": "Effective Date", "questionCode": "date_done", "dataType": "DT", "answers": "", "_answerRequired": true,"answerCardinality":{"min":"1", "max":"1"},
            "displayControl": {
              "colCSS": [{"name": "width", "value": "100%"}, {"name": "min-width", "value": "4em"}]
            }
          }
        ];


        /**
         * Open the file dialog and load a file
         */
        $scope.loadFromFile = function() {
          document.querySelector('#inputAnchor').click();
        };


        /**
         * Callback after the item is selected in the file dialog.
         *
         * @param {Object} item - Refer to angular-file-upload for object definition.
         *   Apart from others, it has selected file reference.
         */
        $scope.uploader.onAfterAddingFile = function(item) {
          // clean up the form before assigning a new one for performance reasons related to AngularJS watches
          selectedFormData.setFormData(null);

          var reader = new FileReader(); // Read from local file system.
          reader.onload = function(event) {
            var importedData = JSON.parse(event.target.result);
            // if the imported data is in FHIR Questionnaire format
            if (importedData.resourceType && importedData.resourceType === "Questionnaire") {
              var questionnaire = LForms.FHIR_SDC.convertQuestionnaireToLForms(importedData);
              $scope.$apply(selectedFormData.setFormData(new LFormsData(questionnaire)));
            }
            // in the internal LForms format
            else {
              $scope.$apply(selectedFormData.setFormData(new LFormsData(importedData)));
            }
          };
          reader.readAsText(item._file);
        };


        // Pagination links
        $scope.pagingLinks = {
          Questionnaire: {previous: null, next: null},
          QuestionnaireResponse: {previous: null, next: null}
        };


        /**
         * Check if there is a link for next or previous page
         * @param resType FHIR resource type
         * @param relation 'next' or 'previous' page
         * @returns {*}
         */
        $scope.hasPagingLink = function(resType, relation) {
          return $scope.pagingLinks[resType][relation];
        };


        /**
         * Get next or previous page of the search result
         * @param resType FHIR resource type
         * @param relation 'next' or 'previous' page
         */
        $scope.getPage = function(resType, relation) {
          var link = $scope.pagingLinks[resType][relation];
          if (link) {
            fhirService.getPage(resType, relation, link);
          }
        };


        /**
         * Set the links for next/previous pages if there is one.
         * @param resType FHIR resoruce type
         * @param links the link field in a searchset bundle
         */
        $scope.processPagingLinks = function(resType, links) {

          var pagingLinks = {previous: null, next: null};

          for(var i=0,iLen=links.length; i<iLen; i++) {
            var link = links[i];
            if (link.relation === 'previous' || link.relation === 'next') {
              pagingLinks[link.relation] = link.url;
            }
          }
          $scope.pagingLinks[resType] = pagingLinks;
        };


        /**
         * Show a saved QuestionnaireResponse
         * @param formIndex form index in the list
         * @param qrInfo info of a QuestionnaireResponse
         */
        $scope.showSavedQQR = function(formIndex, qrInfo) {
          // ResId, ResType, ResName
          if (qrInfo && qrInfo.resType === "QuestionnaireResponse") {
            selectedFormData.setFormData(null);

            $scope.formSelected = {
              groupIndex: 1,
              formIndex: formIndex
            };
            // merge the QuestionnaireResponse into the form
            var formData = LForms.FHIR_SDC.convertQuestionnaireToLForms(qrInfo.questionnaire);
            var newFormData = (new LFormsData(formData)).getFormData();
            var mergedFormData = LForms.FHIR_SDC.mergeQuestionnaireResponseToLForms(newFormData, qrInfo.questionnaireresponse);
            var fhirResInfo = {
              resId : qrInfo.resId,
              resType : qrInfo.resType,
              resTypeDisplay : qrInfo.resTypeDisplay,
              extensionType : qrInfo.extensionType,
              questionnaireResId : qrInfo.questionnaire.id,
              questionnaireName : qrInfo.questionnaire.name
            };
            // set the form data to be displayed
            selectedFormData.setFormData(new LFormsData(mergedFormData), fhirResInfo);
            fhirService.setCurrentQuestionnaire(qrInfo.questionnaire);
          }
        };


        /**
         * Show a Questionnaire
         * @param formIndex form index in the list
         * @param qInfo info of a Questionnaire
         */
        $scope.showSavedQuestionnaire = function(formIndex, qInfo) {

          // ResId, ResType, ResName
          if (qInfo && qInfo.resType === "Questionnaire") {
            selectedFormData.setFormData(null);

            $scope.formSelected = {
              groupIndex: 2,
              formIndex: formIndex
            };
            // merge the QuestionnaireResponse into the form
            var formData = LForms.FHIR_SDC.convertQuestionnaireToLForms(qInfo.questionnaire);
            var newFormData = (new LFormsData(formData)).getFormData();
            var fhirResInfo = {
              resId: null,
              resType: null,
              resTypeDisplay: null,
              extensionType: null,
              questionnaireResId: qInfo.resId,
              questionnaireName: qInfo.questionnaire.name
            };
            // set the form data to be displayed
            selectedFormData.setFormData(new LFormsData(newFormData), fhirResInfo);
            fhirService.setCurrentQuestionnaire(qInfo.questionnaire);

          }

        };

        /**
         * Determines the selection-state CSS class for a form in a list
         * @param listIndex list index
         * @param formIndex form index in the list
         * @returns {string}
         */
        $scope.isSelected = function (listIndex, formIndex) {
          var ret = "";
          if ($scope.formSelected &&
              $scope.formSelected.groupIndex === listIndex &&
              $scope.formSelected.formIndex === formIndex ) {
            //ret = "panel-selected"
            ret = "active"
          }
          return ret;
        };


        /**
         * Update the saved QuestionnaireResponse list when the data is returned
         */
        $scope.$on('LF_FHIR_QUESTIONNAIRERESPONSE_LIST', function(event, arg) {
          $scope.listSavedQR = [];

          if (arg && arg.total > 0) {  // searchset bundle
            for (var i=0, iLen=arg.entry.length; i< iLen; i++) {
              var qr = arg.entry[i].resource;
              if (qr.resourceType === "QuestionnaireResponse") {
                var updated;
                if (qr.meta && qr.meta.lastUpdated) {
                  updated = new Date(qr.meta.lastUpdated).toString("MM/dd/yyyy HH:MM:ss");
                }
                else if (qr.authored) {
                  updated = new Date(qr.authored).toString("MM/dd/yyyy HH:MM:ss");
                }
                var q = null, qName = null;
                if (qr.questionnaire && qr.questionnaire.reference) {
                  var qId = qr.questionnaire.reference.slice("Questionnaire".length+1);
                  var q = fhirService.findQuestionnaire(arg, qId);
                }

                // if the questionnaire resource is included/found in the searchset
                if (q) {
                  qName = q.name;
                  var extension = null,
                    sdcUrl = "http://hl7.org/fhir/us/sdc/StructureDefinition/sdc-questionnaireresponse";
                  if (qr.meta && qr.meta.profile) {
                    for (var j=0, jLen=qr.meta.profile.length; j<jLen; j++) {
                      if (qr.meta.profile[j] === sdcUrl) {
                        extension = "SDC"
                      }
                    }
                  }

                  $scope.listSavedQR.push({
                    resId: qr.id,
                    resName: qName,
                    updatedAt: updated,
                    resType: "QuestionnaireResponse",
                    questionnaire: q,
                    questionnaireresponse: qr,
                    extensionType: extension,
                    resTypeDisplay: extension ? "QuestionnaireResponse (SDC)" : "QuestionnaireResponse"
                  });
                }
              }

            }
            $scope.processPagingLinks("QuestionnaireResponse", arg.link);
            $scope.$apply();
          }
        });


        /**
         * Update the Questionnaire list when the data is returned
         */
        $scope.$on('LF_FHIR_QUESTIONNAIRE_LIST', function(event, arg) {
          $scope.listSavedQ = [];
          if (arg && arg.total > 0) {  // searchset bundle
            for (var i=0, iLen=arg.entry.length; i< iLen; i++) {
              var q = arg.entry[i].resource;
              var updated;
              if (q.meta && q.meta.lastUpdated) {
                updated = new Date(q.meta.lastUpdated).toString("MM/dd/yyyy HH:MM:ss");
              }
              else if (q.date) {
                updated = new Date(q.date).toString("MM/dd/yyyy HH:MM:ss");
              }
              $scope.listSavedQ.push({
                resId: q.id,
                resName: q.name,
                updatedAt: updated,
                resType: "Questionnaire",
                questionnaire: q,
                resTypeDisplay: "Questionnaire"
              });
            }
            $scope.processPagingLinks("Questionnaire", arg.link);
            $scope.$apply();
          }
        });


        /**
         * Update the QuestionnaireResponse list when a QuestionnaireResponse has been deleted on an FHIR server
         */
        $scope.$on('LF_FHIR_RESOURCE_DELETED', function(event, arg) {
          var patient = fhirService.getCurrentPatient();
          fhirService.getAllQRByPatientId(patient.id);
          fhirService.getAllQ();
          $scope.formSelected = {};
        });


        /**
         * Update the QuestionnaireResponse list when a QuestionnaireResponse has been created on an FHIR server
         */
        $scope.$on('LF_FHIR_RESOURCE_CREATED', function(event, arg) {
          var patient = fhirService.getCurrentPatient();
          fhirService.getAllQRByPatientId(patient.id);
          fhirService.getAllQ();
          $scope.formSelected = {
            groupIndex: 1,
            formIndex: 0
          };
        });


        /**
         * Update the QuestionnaireResponse list when a QuestionnaireResponse has been updated on an FHIR server
         */
        $scope.$on('LF_FHIR_RESOURCE_UPDATED', function(event, arg) {
          // also update the list to get the updated timestamp and fhir resources.
          var patient = fhirService.getCurrentPatient();
          fhirService.getAllQRByPatientId(patient.id);
          fhirService.getAllQ();
          $scope.formSelected = {
            groupIndex: 1,
            formIndex: 0
          };
        });


        //Questionnaire
        $scope.selectedQuestionnaire = null;
        /**
         * Show a popup window to let user use a search field to choose a Questionnaire from HAPI FHIR server
         * @param event the click event
         */
        $scope.showQuestionnairePicker = function(event) {
          $scope.selectedQuestionnaireInDialog = null;
          $mdDialog.show({
            scope: $scope,
            preserveScope: true,
            templateUrl: 'fhir-app/questionnaire-select-dialog.html',
            parent: angular.element(document.body),
            targetEvent: event,
            controller: function DialogController($scope, $mdDialog) {
              $scope.dialogTitle = "Questionnaire Picker";
              $scope.dialogLabel = "Choose a Questionnaire";
              $scope.dialogHint = "Search for Questionnaires by name";
              // close the popup without selecting a questionnaire
              $scope.closeDialog = function () {
                $scope.selectedQuestionnaireInDialog = null;
                $mdDialog.hide();
              };

              // close the popup and select a questionnaire
              $scope.confirmAndCloseDialog = function () {
                $scope.selectedQuestionnaire = angular.copy($scope.selectedQuestionnaireInDialog.resource);
                var formData = LForms.FHIR_SDC.convertQuestionnaireToLForms($scope.selectedQuestionnaire);
                // set the form data to be displayed
                selectedFormData.setFormData(new LFormsData(formData));
                fhirService.setCurrentQuestionnaire($scope.selectedQuestionnaire);
                $scope.selectedQuestionnaireInDialog = null;
                $mdDialog.hide();
              };
            }
          });
        };


        /**
         * Check if the newly selected Questionnaire is different that the current Questionnaire
         * @param current the current Questionnaire
         * @param newlySelected the newly selected Questionnaire
         * @returns {*|boolean}
         */
        $scope.differentQuestionnaire = function(current, newlySelected) {
          return (current && newlySelected && current.id !== newlySelected.id)
        };

        /**
         * Search Questionnaire by name
         * @param searchText
         * @returns {*}
         */
        $scope.searchQuestionnaireByName = function(searchText) {
          return fhirService.searchQuestionnaireByName(searchText);
        };


      }
  ]);
